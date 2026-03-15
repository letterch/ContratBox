"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canAddContract, createContract } from "@/lib/services/contract"
import { uploadDocument, documentKey } from "@/lib/services/storage"
import { extractTextFromFile } from "@/lib/services/ocr"
import { extractContractData, type ExtractedContractData } from "@/lib/services/extraction"
import type { ContractCategorySlug } from "@/lib/constants"

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
    console.error("[upload]", e)
    return { ok: false, error: "Échec du stockage du fichier (R2 timeout/config). Vérifiez R2_ENDPOINT, R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY." }
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
      startDate: data.startDate ? new Date(data.startDate) : null,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
      cancellationNoticeDays: data.cancellationNoticeDays ?? null,
      cancellationDeadline: data.cancellationDeadline ? new Date(data.cancellationDeadline) : null,
      autoRenewal: data.autoRenewal ?? null,
      mortgageRate: data.mortgageRate ?? null,
      interestAmountPaid: data.interestAmountPaid ?? null,
      extractedText: data.extractedText ?? null,
      extractionConfidence: data.extractionConfidence ?? null,
      coverageSummary: data.coverageSummary ?? null,
      exclusions: data.exclusions ?? null,
      importantClauses: data.importantClauses ?? null,
      rawExtraction: data.rawExtraction ?? null,
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

  return { ok: true, contractId: contract.id }
}

export async function getCanAddContract() {
  const session = await auth()
  if (!session?.user?.id) return { allowed: false, count: 0, limit: 3 }
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
