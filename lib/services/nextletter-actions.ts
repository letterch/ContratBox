import { prisma } from "@/lib/db"
import { draftCancellationLetter, draftDisputeLetter } from "@/lib/services/letter-draft"
import {
  buildContractCancellationNextLetterUrl,
  getNextLetterBaseUrl,
} from "@/lib/services/nextletter"

export type NextLetterActionType =
  | "cancel_subscription"
  | "dispute_invoice"
  | "claim_refund"
  | "contract_cancellation"
  | "custom_letter"

export async function createContractCancellationAction(input: {
  householdId: string
  userId: string
  contractId: string
  senderName?: string | null
}) {
  const contract = await prisma.contract.findFirst({
    where: { id: input.contractId, householdId: input.householdId },
    include: { member: true },
  })
  if (!contract) throw new Error("Contrat introuvable")

  const memberName = contract.member
    ? `${contract.member.firstName}${contract.member.lastName ? ` ${contract.member.lastName}` : ""}`
    : input.senderName ?? null

  const letterBody = draftCancellationLetter({
    provider: contract.provider,
    policyNumber: contract.policyNumber,
    contractTitle: contract.title,
    category: contract.category,
    memberName,
    noticeDays: contract.cancellationNoticeDays,
    renewalDateIso: contract.renewalDate?.toISOString().slice(0, 10) ?? null,
    cancellationDeadlineIso: contract.cancellationDeadline?.toISOString().slice(0, 10) ?? null,
    senderName: input.senderName,
  })

  const nextLetterUrl = buildContractCancellationNextLetterUrl({
    provider: contract.provider,
    policyNumber: contract.policyNumber,
    contractTitle: contract.title,
    category: contract.category,
    noticeDays: contract.cancellationNoticeDays,
    renewalDateIso: contract.renewalDate?.toISOString().slice(0, 10) ?? null,
    memberName,
    extraContext: letterBody.slice(0, 500),
  })

  const row = await prisma.nextLetterActionLog.create({
    data: {
      householdId: input.householdId,
      userId: input.userId,
      contractId: contract.id,
      actionType: "contract_cancellation",
      status: "draft",
      letterBody,
      payload: {
        nextLetterUrl,
        provider: contract.provider,
        policyNumber: contract.policyNumber,
        title: contract.title,
      },
    },
  })

  return { action: row, letterBody, nextLetterUrl }
}

export async function createBillDisputeAction(input: {
  householdId: string
  userId: string
  billId: string
  reason?: string
  senderName?: string | null
}) {
  const bill = await prisma.bill.findFirst({
    where: { id: input.billId, householdId: input.householdId },
  })
  if (!bill) throw new Error("Facture introuvable")

  const letterBody = draftDisputeLetter({
    provider: bill.provider,
    invoiceNumber: bill.invoiceNumber,
    amount: Number(bill.amount),
    reason: input.reason,
    senderName: input.senderName,
  })

  const base = getNextLetterBaseUrl()
  const url = new URL("/compose", base)
  url.searchParams.set("type", "dispute_invoice")
  if (bill.provider) url.searchParams.set("provider", bill.provider)
  if (bill.invoiceNumber) url.searchParams.set("invoice", bill.invoiceNumber)
  url.searchParams.set("amount", String(Number(bill.amount)))

  const row = await prisma.nextLetterActionLog.create({
    data: {
      householdId: input.householdId,
      userId: input.userId,
      billId: bill.id,
      actionType: "dispute_invoice",
      status: "draft",
      letterBody,
      payload: { nextLetterUrl: url.toString() },
    },
  })

  return { action: row, letterBody, nextLetterUrl: url.toString() }
}

export async function listActionsForHousehold(householdId: string, take = 40) {
  return prisma.nextLetterActionLog.findMany({
    where: { householdId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      contract: { select: { id: true, title: true, provider: true } },
      bill: { select: { id: true, title: true, provider: true } },
    },
  })
}

export async function updateActionStatus(input: {
  id: string
  householdId: string
  status: "draft" | "copied" | "opened_nextletter" | "sent" | "archived"
}) {
  return prisma.nextLetterActionLog.updateMany({
    where: { id: input.id, householdId: input.householdId },
    data: { status: input.status },
  })
}

/** Suggestions d'actions à partir des contrats (fenêtre de résiliation). */
export function suggestActionsFromContracts(
  contracts: Array<{
    id: string
    title: string | null
    provider: string | null
    cancellationDeadline: Date | null
    status: string
  }>,
  now = new Date()
): Array<{ contractId: string; label: string; urgency: "high" | "medium" | "low" }> {
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + 90)
  const out: Array<{ contractId: string; label: string; urgency: "high" | "medium" | "low" }> = []
  for (const c of contracts) {
    if (c.status !== "active" || !c.cancellationDeadline) continue
    if (c.cancellationDeadline < now || c.cancellationDeadline > horizon) continue
    const days = Math.ceil((c.cancellationDeadline.getTime() - now.getTime()) / 86400000)
    out.push({
      contractId: c.id,
      label: `Résilier ${c.provider ?? c.title ?? "contrat"} (délai ${days}j)`,
      urgency: days <= 14 ? "high" : days <= 45 ? "medium" : "low",
    })
  }
  return out.sort((a, b) => (a.urgency === b.urgency ? 0 : a.urgency === "high" ? -1 : 1))
}
