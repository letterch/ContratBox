"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  createBill,
  updateBill,
  deleteBill,
  markBillPaid,
  uploadAndExtractBill,
  createBillFromExtraction,
  countActiveBills,
  type CreateBillInput,
} from "@/lib/services/bills"
import { getAccessContextForUser, accessCanAddBill, accessCanUseModule } from "@/lib/services/access-context"
import { syncBillRemindersForHousehold } from "@/lib/services/reminder-sync"
import { FREE_BILL_LIMIT, BILL_STATUSES, BILL_RECURRENCES } from "@/lib/constants"
import type { BillStatus, BillRecurrence } from "@/lib/constants"

async function getOwnerHousehold(userId: string) {
  return prisma.household.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
}

function parseDate(value: FormDataEntryValue | null): Date | null {
  if (!value || typeof value !== "string") return null
  const v = value.trim()
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== "string") return null
  const cleaned = value.replace(/[^0-9,.\-]/g, "").replace(",", ".")
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

export type CreateBillActionResult =
  | { ok: true; billId: string }
  | { ok: false; error: string }

/** Création manuelle d'une facture via formulaire. */
export async function createBillAction(formData: FormData): Promise<CreateBillActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" }
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access || !access.household) return { ok: false, error: "Foyer introuvable" }
  if (!accessCanUseModule(access, "module_bills")) {
    return { ok: false, error: "Module factures indisponible pour votre plan." }
  }
  if (!accessCanAddBill(access)) {
    return {
      ok: false,
      error: `Limite de ${FREE_BILL_LIMIT} factures gratuites atteinte. Passez à un abonnement pour en ajouter.`,
    }
  }

  const title = (formData.get("title") as string | null)?.trim()
  const amount = parseAmount(formData.get("amount"))
  if (!title) return { ok: false, error: "Titre requis" }
  if (amount == null || amount < 0) return { ok: false, error: "Montant invalide" }

  const status = (formData.get("status") as string | null) || "pending"
  const recurrence = (formData.get("recurrence") as string | null) || "one_off"

  const input: CreateBillInput = {
    householdId: access.household.id,
    userId: session.user.id,
    title,
    amount,
    provider: (formData.get("provider") as string | null) ?? null,
    category: (formData.get("category") as string | null) ?? null,
    invoiceNumber: (formData.get("invoiceNumber") as string | null) ?? null,
    reference: (formData.get("reference") as string | null) ?? null,
    currency: (formData.get("currency") as string | null) ?? "CHF",
    issueDate: parseDate(formData.get("issueDate")),
    dueDate: parseDate(formData.get("dueDate")),
    paidAt: parseDate(formData.get("paidAt")),
    status: (BILL_STATUSES as readonly string[]).includes(status) ? (status as BillStatus) : "pending",
    recurrence: (BILL_RECURRENCES as readonly string[]).includes(recurrence)
      ? (recurrence as BillRecurrence)
      : "one_off",
    contractId: ((formData.get("contractId") as string | null) || null) || null,
    memberId: ((formData.get("memberId") as string | null) || null) || null,
    isHouseholdWide: formData.get("isHouseholdWide") === "on",
    notes: (formData.get("notes") as string | null) ?? null,
    source: "manual",
  }

  const created = await createBill(input)
  await syncBillRemindersForHousehold(access.household.id).catch(() => null)
  revalidatePath("/bills")
  return { ok: true, billId: created.id }
}

/** Upload + extraction OCR d'une facture, sans persister la facture (preview). */
export async function uploadAndExtractBillAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { ok: false as const, error: "Non authentifié" }
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access || !access.household) return { ok: false as const, error: "Foyer introuvable" }
  if (!accessCanUseModule(access, "module_bills")) {
    return { ok: false as const, error: "Module factures indisponible pour votre plan." }
  }
  if (!accessCanAddBill(access)) {
    return {
      ok: false as const,
      error: `Limite de ${FREE_BILL_LIMIT} factures gratuites atteinte.`,
    }
  }
  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return { ok: false as const, error: "Fichier manquant" }
  const result = await uploadAndExtractBill(session.user.id, access.household.id, file)
  return result
}

/** Confirme la création d'une facture après revue OCR (UI valide / corrige les champs). */
export async function confirmBillFromExtractionAction(payload: {
  extraction: Parameters<typeof createBillFromExtraction>[0]["extraction"]
  extractedText: string
  textExtractionMeta: unknown
  r2Key: string
  mimeType: string
  sizeBytes: number
  originalFilename: string
  override?: Partial<CreateBillInput>
}): Promise<CreateBillActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" }
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access || !access.household) return { ok: false, error: "Foyer introuvable" }
  if (!accessCanUseModule(access, "module_bills")) {
    return { ok: false, error: "Module factures indisponible pour votre plan." }
  }
  if (!accessCanAddBill(access)) {
    return { ok: false, error: `Limite de ${FREE_BILL_LIMIT} factures gratuites atteinte.` }
  }
  const created = await createBillFromExtraction({
    userId: session.user.id,
    householdId: access.household.id,
    extraction: payload.extraction,
    extractedText: payload.extractedText,
    textExtractionMeta: payload.textExtractionMeta,
    r2Key: payload.r2Key,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    originalFilename: payload.originalFilename,
    override: payload.override,
    source: "ocr",
  })
  await syncBillRemindersForHousehold(access.household.id).catch(() => null)
  revalidatePath("/bills")
  return { ok: true, billId: created.id }
}

export async function updateBillAction(billId: string, formData: FormData): Promise<CreateBillActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" }
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access || !access.household) return { ok: false, error: "Foyer introuvable" }

  const status = (formData.get("status") as string | null) || undefined
  const recurrence = (formData.get("recurrence") as string | null) || undefined

  const updates: Parameters<typeof updateBill>[2] = {
    title: (formData.get("title") as string | null) || undefined,
    provider: (formData.get("provider") as string | null) ?? undefined,
    category: (formData.get("category") as string | null) ?? undefined,
    invoiceNumber: (formData.get("invoiceNumber") as string | null) ?? undefined,
    reference: (formData.get("reference") as string | null) ?? undefined,
    amount: parseAmount(formData.get("amount")) ?? undefined,
    currency: (formData.get("currency") as string | null) ?? undefined,
    issueDate: parseDate(formData.get("issueDate")) ?? undefined,
    dueDate: parseDate(formData.get("dueDate")) ?? undefined,
    paidAt: parseDate(formData.get("paidAt")) ?? undefined,
    status:
      status && (BILL_STATUSES as readonly string[]).includes(status) ? (status as BillStatus) : undefined,
    recurrence:
      recurrence && (BILL_RECURRENCES as readonly string[]).includes(recurrence)
        ? (recurrence as BillRecurrence)
        : undefined,
    contractId: (formData.get("contractId") as string | null) || undefined,
    memberId: (formData.get("memberId") as string | null) || undefined,
    isHouseholdWide:
      formData.get("isHouseholdWide") != null ? formData.get("isHouseholdWide") === "on" : undefined,
    notes: (formData.get("notes") as string | null) ?? undefined,
  }

  await updateBill(billId, session.user.id, updates)
  await syncBillRemindersForHousehold(access.household.id).catch(() => null)
  revalidatePath("/bills")
  revalidatePath(`/bills/${billId}`)
  return { ok: true, billId }
}

export async function markBillPaidAction(billId: string): Promise<CreateBillActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" }
  await markBillPaid(billId, session.user.id, new Date())
  revalidatePath("/bills")
  revalidatePath(`/bills/${billId}`)
  return { ok: true, billId }
}

export async function deleteBillAction(billId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" }
  await deleteBill(billId, session.user.id)
  revalidatePath("/bills")
  return { ok: true }
}

export async function getBillsAccessSnapshotAction() {
  const session = await auth()
  if (!session?.user?.id) return null
  const access = await getAccessContextForUser(session.user.id, session)
  if (!access?.household) return null
  const count = await countActiveBills(access.household.id)
  return {
    moduleEnabled: accessCanUseModule(access, "module_bills"),
    canAdd: accessCanAddBill(access),
    count,
    limit: access.entitlements.quotas.maxBills,
  }
}
