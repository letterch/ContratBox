"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { FREE_CONTRACT_LIMIT } from "@/lib/constants"
import { canAddContract, createContract } from "@/lib/services/contract"
import { uploadDocument, documentKey, getStorageDebugConfig } from "@/lib/services/storage"
import { extractTextFromFile } from "@/lib/services/ocr"
import { extractContractData, type ExtractedContractData } from "@/lib/services/extraction"
import { calculateCancellationDeadline } from "@/lib/services/contract-deadline"
import type { ContractCategorySlug } from "@/lib/constants"
import { getContractById } from "@/lib/services/contract"
import { getKeyDateFromContractLike } from "@/lib/services/contract-key-date"
import { getInboxItemContractSeed, markAdministrativeItemConverted } from "@/lib/services/administrative-inbox"

export type UploadAndExtractResult = {
  ok: true
  extracted: ExtractedContractData
  extractedText: string
  file: { r2Key: string; name: string; mimeType: string; sizeBytes: number }
} | { ok: false; error: string }

export async function uploadAndExtractContract(formData: FormData): Promise<UploadAndExtractResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" }

  const { allowed } = await canAddContract(session.user.id)
  if (!allowed) return { ok: false, error: "Limite de contrats gratuits atteinte. Passez à un abonnement pour en ajouter." }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return { ok: false, error: "Fichier manquant" }
  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || "application/pdf"

  const { text: extractedText, hadText } = await extractTextFromFile(buffer, mimeType)
  const textToExtract = extractedText || "(Document sans texte extrait — saisie manuelle recommandée.)"
  const extracted = await extractContractData(textToExtract)

  const r2Key = documentKey(session.user.id, "draft", file.name)
  try {
    await uploadDocument(r2Key, buffer, mimeType)
  } catch (e) {
    const details = e as { name?: string; message?: string; code?: string; $metadata?: { attempts?: number } }
    console.error("[upload]", {
      error: details?.message ?? String(e),
      code: details?.code,
      name: details?.name,
      attempts: details?.$metadata?.attempts,
      storage: getStorageDebugConfig(),
    })
    return {
      ok: false,
      error:
        "Échec du stockage du fichier (R2 timeout/config). Vérifiez R2_ENDPOINT (API endpoint), R2_BUCKET_NAME et les clés R2.",
    }
  }

  return {
    ok: true,
    extracted,
    extractedText: extractedText || "",
    file: { r2Key, name: file.name, mimeType, sizeBytes: file.size },
  }
}

export type SaveContractInput = {
  file: { r2Key: string; name: string; mimeType: string; sizeBytes: number }
  sourceAdministrativeItemId?: string | null
  title?: string | null
  provider?: string | null
  contractType?: string | null
  category?: ContractCategorySlug | null
  policyNumber?: string | null
  memberId?: string | null
  isHouseholdWide: boolean
  premiumAmount?: number | null
  premiumFrequency?: string | null
  startDate?: string | null
  renewalDate?: string | null
  endDate?: string | null
  maturityDate?: string | null
  cancellationNoticeDays?: number | null
  cancellationDeadline?: string | null
  autoRenewal?: boolean | null
  mortgageRate?: number | null
  interestAmountPaid?: number | null
  extractedText?: string | null
  extractionConfidence?: number | null
  coverageSummary?: string | null
  exclusions?: string | null
  importantClauses?: string | null
  rawExtraction?: object | null
}

export async function saveContractFromUpload(data: SaveContractInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")

  const { allowed } = await canAddContract(session.user.id)
  if (!allowed) throw new Error("Limite de contrats gratuits atteinte.")

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
  })
  if (!household) throw new Error("Aucun ménage trouvé")

  const raw = (data.rawExtraction as Record<string, unknown> | null) ?? null
  const startDate = data.startDate ? new Date(data.startDate) : null
  const renewalDate = data.renewalDate ? new Date(data.renewalDate) : null
  const endDate = data.endDate ? new Date(data.endDate) : null
  const maturityDate = data.maturityDate ? new Date(data.maturityDate) : null
  const keyDate =
    getKeyDateFromContractLike({
      renewalDate,
      endDate,
      maturityDate,
      startDate,
      rawExtraction: raw,
    }) ??
    null
  const noticeValue = raw && Number(raw.cancellationNoticeValue)
  const noticeUnit = raw?.cancellationNoticeUnit as "days" | "months" | "years" | undefined
  const computedDeadline =
    data.cancellationDeadline
      ? new Date(data.cancellationDeadline)
      : calculateCancellationDeadline(
          keyDate,
          data.cancellationNoticeDays ?? null,
          Number.isFinite(noticeValue) ? noticeValue : null,
          noticeUnit
        )

  const contract = await prisma.contract.create({
    data: {
      householdId: household.id,
      createdById: session.user.id,
      title: data.title ?? null,
      provider: data.provider ?? null,
      contractType: data.contractType ?? null,
      category: data.category ?? null,
      policyNumber: data.policyNumber ?? null,
      memberId: data.memberId ?? null,
      isHouseholdWide: data.isHouseholdWide,
      premiumAmount: data.premiumAmount ?? null,
      premiumFrequency: data.premiumFrequency ?? null,
      startDate,
      renewalDate,
      endDate: endDate ?? (keyDate && !renewalDate && !maturityDate ? keyDate : null),
      maturityDate,
      cancellationNoticeDays:
        data.cancellationNoticeDays ??
        (Number.isFinite(noticeValue)
          ? noticeUnit === "months"
            ? Math.round((noticeValue as number) * 30)
            : noticeUnit === "years"
              ? Math.round((noticeValue as number) * 365)
              : Math.round(noticeValue as number)
          : null),
      cancellationDeadline: computedDeadline,
      autoRenewal: data.autoRenewal ?? null,
      mortgageRate: data.mortgageRate ?? null,
      interestAmountPaid: data.interestAmountPaid ?? null,
      extractedText: data.extractedText ?? null,
      extractionConfidence: data.extractionConfidence ?? null,
      coverageSummary: data.coverageSummary ?? null,
      exclusions: data.exclusions ?? null,
      importantClauses: data.importantClauses ?? null,
      rawExtraction: data.rawExtraction ? (data.rawExtraction as unknown as Parameters<typeof prisma.contract.create>[0]["data"]["rawExtraction"]) : undefined,
      extractedAt: data.rawExtraction ? new Date() : null,
    },
  })

  await prisma.document.create({
    data: {
      contractId: contract.id,
      name: data.file.name,
      mimeType: data.file.mimeType,
      sizeBytes: data.file.sizeBytes,
      r2Key: data.file.r2Key,
      extractedText: data.extractedText ?? null,
    },
  })

  const extractionRaw = (data.rawExtraction ?? {}) as Record<string, unknown>
  const tranches = Array.isArray(extractionRaw.mortgageTranches)
    ? extractionRaw.mortgageTranches
    : []
  const reminderRows = tranches
    .map((t) => {
      const row = (t && typeof t === "object" ? (t as Record<string, unknown>) : null)
      if (!row?.endDate) return null
      const endDate = new Date(String(row.endDate))
      if (Number.isNaN(endDate.getTime())) return null
      const triggerAt = new Date(endDate)
      triggerAt.setDate(triggerAt.getDate() - 90)
      return {
        contractId: contract.id,
        type: "mortgage_maturity",
        triggerAt,
      } as const
    })
    .filter((x): x is { contractId: string; type: "mortgage_maturity"; triggerAt: Date } => Boolean(x))

  if (reminderRows.length) {
    await prisma.reminder.createMany({ data: reminderRows })
  } else if (data.maturityDate) {
    const endDate = new Date(data.maturityDate)
    if (!Number.isNaN(endDate.getTime())) {
      const triggerAt = new Date(endDate)
      triggerAt.setDate(triggerAt.getDate() - 90)
      await prisma.reminder.create({
        data: {
          contractId: contract.id,
          type: "mortgage_maturity",
          triggerAt,
        },
      })
    }
  }

  const leaseEndDateRaw =
    (typeof extractionRaw.leaseEndDate === "string" && extractionRaw.leaseEndDate) ||
    data.endDate ||
    data.renewalDate ||
    null
  if (leaseEndDateRaw) {
    const leaseEndDate = new Date(leaseEndDateRaw)
    if (!Number.isNaN(leaseEndDate.getTime())) {
      const noticeDays =
        data.cancellationNoticeDays ??
        (typeof extractionRaw.leaseNoticeValue === "number"
          ? extractionRaw.leaseNoticeUnit === "months"
            ? Math.round(extractionRaw.leaseNoticeValue * 30)
            : extractionRaw.leaseNoticeUnit === "years"
              ? Math.round(extractionRaw.leaseNoticeValue * 365)
              : Math.round(extractionRaw.leaseNoticeValue)
          : null)
      const triggerAt = noticeDays
        ? new Date(leaseEndDate.getTime() - noticeDays * 24 * 60 * 60 * 1000)
        : new Date(leaseEndDate.getTime() - 60 * 24 * 60 * 60 * 1000)
      await prisma.reminder.create({
        data: {
          contractId: contract.id,
          type: "lease_notice_window",
          triggerAt,
        },
      })
    }
  }

  if (data.sourceAdministrativeItemId) {
    await markAdministrativeItemConverted(data.sourceAdministrativeItemId, contract.id, session.user.id)
  }

  return { ok: true, contractId: contract.id }
}

export async function getUploadSeedFromInbox(itemId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const { allowed } = await canAddContract(session.user.id)
  if (!allowed) throw new Error("Limite de contrats atteinte pour votre offre.")
  return getInboxItemContractSeed(itemId, session.user.id)
}

export async function getCanAddContract() {
  const session = await auth()
  if (!session?.user?.id) return { allowed: false, count: 0, limit: FREE_CONTRACT_LIMIT }
  return canAddContract(session.user.id)
}

export async function getUploadPageData() {
  const session = await auth()
  if (!session?.user?.id) return { canAdd: false, members: [] }
  const { allowed } = await canAddContract(session.user.id)
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: { members: true },
  })
  return {
    canAdd: allowed,
    members: household?.members ?? [],
  }
}

export async function deleteContractById(contractId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const contract = await prisma.contract.findFirst({
    where: { id: contractId },
    include: { household: true },
  })
  if (!contract || contract.household.ownerId !== session.user.id) {
    throw new Error("Contrat introuvable")
  }
  await prisma.contract.delete({ where: { id: contractId } })
  return { ok: true }
}

export type UpdateContractInput = {
  id: string
  provider?: string | null
  contractType?: string | null
  category?: string | null
  policyNumber?: string | null
  memberId?: string | null
  isHouseholdWide?: boolean
  premiumAmount?: number | null
  premiumFrequency?: string | null
  startDate?: string | null
  renewalDate?: string | null
  endDate?: string | null
  maturityDate?: string | null
  cancellationNoticeDays?: number | null
  autoRenewal?: boolean | null
  mortgageRate?: number | null
  coverageSummary?: string | null
  exclusions?: string | null
  importantClauses?: string | null
  rentalRole?: "owner" | "tenant" | null
  minimumCommitmentValue?: number | null
  minimumCommitmentUnit?: "months" | "years" | null
  minimumCommitmentEndDate?: string | null
}

export async function getContractEditData(contractId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const contract = await getContractById(contractId, session.user.id)
  if (!contract) throw new Error("Contrat introuvable")
  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: { members: true },
  })
  return {
    contract,
    members: household?.members ?? [],
  }
}

export async function updateContractManually(input: UpdateContractInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Non authentifié")
  const existing = await getContractById(input.id, session.user.id)
  if (!existing) throw new Error("Contrat introuvable")

  const raw = (existing.rawExtraction ?? {}) as Record<string, unknown>
  const category = input.category ?? existing.category ?? null
  const isMortgageCategory = category === "mortgage"
  const startDate = input.startDate ? new Date(input.startDate) : null
  const renewalDate = input.renewalDate ? new Date(input.renewalDate) : null
  const endDate = input.endDate ? new Date(input.endDate) : null
  const maturityDate = isMortgageCategory && input.maturityDate ? new Date(input.maturityDate) : null
  const mergedRaw: Record<string, unknown> = {
    ...raw,
    minimumCommitmentValue:
      input.minimumCommitmentValue == null ? raw.minimumCommitmentValue ?? null : input.minimumCommitmentValue,
    minimumCommitmentUnit:
      input.minimumCommitmentUnit == null ? raw.minimumCommitmentUnit ?? null : input.minimumCommitmentUnit,
    minimumCommitmentEndDate:
      input.minimumCommitmentEndDate == null
        ? raw.minimumCommitmentEndDate ?? null
        : input.minimumCommitmentEndDate,
  }
  const keyDate = getKeyDateFromContractLike({
    startDate,
    renewalDate,
    endDate,
    maturityDate,
    rawExtraction: mergedRaw,
  })
  const noticeValue = Number(raw.cancellationNoticeValue)
  const noticeUnit = raw.cancellationNoticeUnit as "days" | "months" | "years" | null
  const cancellationDeadline = calculateCancellationDeadline(
    keyDate,
    input.cancellationNoticeDays ?? null,
    Number.isFinite(noticeValue) ? noticeValue : null,
    noticeUnit
  )

  await prisma.contract.update({
    where: { id: input.id },
    data: {
      provider: input.provider ?? null,
      contractType: input.contractType ?? null,
      category,
      policyNumber: input.policyNumber ?? null,
      memberId: input.isHouseholdWide ? null : input.memberId ?? null,
      isHouseholdWide: input.isHouseholdWide ?? false,
      premiumAmount: input.premiumAmount ?? null,
      premiumFrequency: input.premiumFrequency ?? null,
      startDate,
      renewalDate,
      endDate: endDate ?? (keyDate && !renewalDate && !maturityDate ? keyDate : null),
      maturityDate,
      cancellationNoticeDays: input.cancellationNoticeDays ?? null,
      autoRenewal: input.autoRenewal ?? null,
      mortgageRate: isMortgageCategory ? (input.mortgageRate ?? null) : null,
      coverageSummary: input.coverageSummary ?? null,
      exclusions: input.exclusions ?? null,
      importantClauses: input.importantClauses ?? null,
      cancellationDeadline,
      rawExtraction: {
        ...(mergedRaw as object),
        startDate: startDate ? startDate.toISOString().slice(0, 10) : null,
        renewalDate: renewalDate ? renewalDate.toISOString().slice(0, 10) : raw.renewalDate ?? null,
        endDate: endDate ? endDate.toISOString().slice(0, 10) : raw.endDate ?? null,
        maturityDate: maturityDate ? maturityDate.toISOString().slice(0, 10) : null,
        rentalRole: input.rentalRole ?? raw.rentalRole ?? "tenant",
        minimumCommitmentValue:
          input.minimumCommitmentValue == null ? mergedRaw.minimumCommitmentValue ?? null : input.minimumCommitmentValue,
        minimumCommitmentUnit:
          input.minimumCommitmentUnit == null ? mergedRaw.minimumCommitmentUnit ?? null : input.minimumCommitmentUnit,
        minimumCommitmentEndDate:
          input.minimumCommitmentEndDate == null
            ? mergedRaw.minimumCommitmentEndDate ?? null
            : input.minimumCommitmentEndDate,
      } as Parameters<typeof prisma.contract.update>[0]["data"]["rawExtraction"],
      updatedAt: new Date(),
    },
  })
  return { ok: true }
}
