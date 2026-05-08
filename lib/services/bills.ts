import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { uploadDocument, billObjectKey, isStorageConfigured } from "@/lib/services/storage"
import { extractTextFromFile } from "@/lib/services/ocr"
import { extractBillData, type ExtractedBill } from "@/lib/services/bill-extraction"
import {
  BILL_CATEGORY_SLUGS,
  BILL_RECURRENCES,
  BILL_STATUSES,
  type BillStatus,
  type BillRecurrence,
} from "@/lib/constants"

export type CreateBillInput = {
  householdId: string
  userId: string
  title: string
  provider?: string | null
  category?: string | null
  invoiceNumber?: string | null
  reference?: string | null
  amount: number
  currency?: string | null
  issueDate?: Date | null
  dueDate?: Date | null
  paidAt?: Date | null
  status?: BillStatus
  recurrence?: BillRecurrence
  contractId?: string | null
  memberId?: string | null
  isHouseholdWide?: boolean
  notes?: string | null
  source?: "manual" | "ocr" | "email" | "inbox_conversion"
  /** Si OCR/email : champs d'extraction. */
  extractedText?: string | null
  extractionConfidence?: number | null
  rawExtraction?: Prisma.InputJsonValue | null
  textExtractionMeta?: Prisma.InputJsonValue | null
}

export type UpdateBillInput = Partial<Omit<CreateBillInput, "householdId" | "userId">> & {
  status?: BillStatus
}

function normalizeCategory(value?: string | null): string | null {
  if (!value) return null
  const v = value.toLowerCase().trim()
  return (BILL_CATEGORY_SLUGS as readonly string[]).includes(v) ? v : "other"
}

function normalizeRecurrence(value?: string | null): BillRecurrence {
  if (!value) return "one_off"
  const v = value.toLowerCase().trim()
  return (BILL_RECURRENCES as readonly string[]).includes(v) ? (v as BillRecurrence) : "one_off"
}

function normalizeStatus(value?: string | null): BillStatus {
  if (!value) return "pending"
  const v = value.toLowerCase().trim()
  return (BILL_STATUSES as readonly string[]).includes(v) ? (v as BillStatus) : "pending"
}

async function assertHouseholdOwnership(householdId: string, userId: string) {
  const h = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
    select: { id: true },
  })
  if (!h) throw new Error("Ménage introuvable")
}

export async function countActiveBills(householdId: string): Promise<number> {
  return prisma.bill.count({
    where: { householdId, status: { not: "cancelled" } },
  })
}

export async function createBill(input: CreateBillInput) {
  await assertHouseholdOwnership(input.householdId, input.userId)
  const bill = await prisma.bill.create({
    data: {
      householdId: input.householdId,
      createdById: input.userId,
      title: input.title.trim(),
      provider: input.provider?.trim() || null,
      category: normalizeCategory(input.category) ?? null,
      invoiceNumber: input.invoiceNumber?.trim() || null,
      reference: input.reference?.trim() || null,
      amount: input.amount,
      currency: (input.currency || "CHF").toUpperCase(),
      issueDate: input.issueDate ?? null,
      dueDate: input.dueDate ?? null,
      paidAt: input.paidAt ?? null,
      status: normalizeStatus(input.status),
      recurrence: normalizeRecurrence(input.recurrence),
      contractId: input.contractId ?? null,
      memberId: input.memberId ?? null,
      isHouseholdWide: input.isHouseholdWide ?? false,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
      extractedText: input.extractedText ?? null,
      extractionConfidence: input.extractionConfidence ?? null,
      rawExtraction: input.rawExtraction ?? undefined,
      textExtractionMeta: input.textExtractionMeta ?? undefined,
    },
  })
  return bill
}

export async function updateBill(billId: string, userId: string, input: UpdateBillInput) {
  const existing = await prisma.bill.findFirst({
    where: { id: billId },
    include: { household: { select: { ownerId: true } } },
  })
  if (!existing || existing.household.ownerId !== userId) {
    throw new Error("Facture introuvable")
  }
  const data: Prisma.BillUpdateInput = {}
  if (input.title != null) data.title = input.title.trim()
  if (input.provider !== undefined) data.provider = input.provider?.trim() || null
  if (input.category !== undefined) data.category = normalizeCategory(input.category)
  if (input.invoiceNumber !== undefined) data.invoiceNumber = input.invoiceNumber?.trim() || null
  if (input.reference !== undefined) data.reference = input.reference?.trim() || null
  if (input.amount != null) data.amount = input.amount
  if (input.currency !== undefined) data.currency = (input.currency || "CHF").toUpperCase()
  if (input.issueDate !== undefined) data.issueDate = input.issueDate
  if (input.dueDate !== undefined) data.dueDate = input.dueDate
  if (input.paidAt !== undefined) data.paidAt = input.paidAt
  if (input.status !== undefined) data.status = normalizeStatus(input.status)
  if (input.recurrence !== undefined) data.recurrence = normalizeRecurrence(input.recurrence)
  if (input.contractId !== undefined) {
    data.contract = input.contractId
      ? { connect: { id: input.contractId } }
      : { disconnect: true }
  }
  if (input.memberId !== undefined) {
    data.member = input.memberId
      ? { connect: { id: input.memberId } }
      : { disconnect: true }
  }
  if (input.isHouseholdWide !== undefined) data.isHouseholdWide = input.isHouseholdWide
  if (input.notes !== undefined) data.notes = input.notes
  return prisma.bill.update({ where: { id: billId }, data })
}

export async function markBillPaid(billId: string, userId: string, paidAt: Date = new Date()) {
  return updateBill(billId, userId, { status: "paid", paidAt })
}

export async function deleteBill(billId: string, userId: string) {
  const existing = await prisma.bill.findFirst({
    where: { id: billId },
    include: { household: { select: { ownerId: true } } },
  })
  if (!existing || existing.household.ownerId !== userId) {
    throw new Error("Facture introuvable")
  }
  await prisma.bill.delete({ where: { id: billId } })
}

export type UploadAndExtractBillResult =
  | {
      ok: true
      extractedText: string
      extraction: ExtractedBill
      r2Key: string
      mimeType: string
      sizeBytes: number
      originalFilename: string
      textExtractionMeta: unknown
    }
  | { ok: false; error: string }

/**
 * Upload + OCR + extraction IA d'une facture, sans persister la facture (pour permettre
 * une étape de revue côté UI). L'appelant créera ensuite la facture + BillDocument.
 */
export async function uploadAndExtractBill(
  userId: string,
  householdId: string,
  file: File
): Promise<UploadAndExtractBillResult> {
  if (!isStorageConfigured()) {
    return { ok: false, error: "Stockage fichier non configuré (R2)." }
  }
  await assertHouseholdOwnership(householdId, userId)
  if (!file || file.size === 0) return { ok: false, error: "Fichier manquant" }

  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || "application/pdf"

  const { text: extractedText, meta: textExtractionMeta } = await extractTextFromFile(buffer, mimeType)
  const extraction = await extractBillData(extractedText || "")

  const r2Key = billObjectKey(userId, file.name)
  try {
    await uploadDocument(r2Key, buffer, mimeType)
  } catch {
    return { ok: false, error: "Échec upload du fichier." }
  }

  return {
    ok: true,
    extractedText: extractedText || "",
    extraction,
    r2Key,
    mimeType,
    sizeBytes: file.size,
    originalFilename: file.name,
    textExtractionMeta: textExtractionMeta ?? null,
  }
}

/**
 * Crée une facture à partir d'une extraction OCR + le justificatif déjà uploadé sur R2.
 * Cette fonction est utilisée en deux temps : d'abord uploadAndExtractBill (preview), puis
 * confirmation via UI -> createBillFromExtraction.
 */
export async function createBillFromExtraction(params: {
  userId: string
  householdId: string
  extraction: ExtractedBill
  extractedText: string
  textExtractionMeta: unknown
  r2Key: string
  mimeType: string
  sizeBytes: number
  originalFilename: string
  /** Surcharges utilisateur post-revue. */
  override?: Partial<CreateBillInput>
  source?: CreateBillInput["source"]
}) {
  const e = params.extraction
  const issue = e.issueDate ? new Date(e.issueDate) : null
  const due = e.dueDate ? new Date(e.dueDate) : null
  const fallbackTitle = e.provider
    ? `Facture ${e.provider}${due ? ` ${due.toISOString().slice(0, 7)}` : ""}`
    : params.originalFilename || "Facture"

  const created = await createBill({
    householdId: params.householdId,
    userId: params.userId,
    title: params.override?.title || fallbackTitle,
    provider: params.override?.provider ?? e.provider ?? null,
    category: params.override?.category ?? e.category ?? null,
    invoiceNumber: params.override?.invoiceNumber ?? e.invoiceNumber ?? null,
    reference: params.override?.reference ?? e.reference ?? null,
    amount: params.override?.amount ?? e.amount ?? 0,
    currency: params.override?.currency ?? e.currency ?? "CHF",
    issueDate:
      params.override?.issueDate !== undefined
        ? params.override.issueDate
        : issue && !Number.isNaN(issue.getTime())
        ? issue
        : null,
    dueDate:
      params.override?.dueDate !== undefined
        ? params.override.dueDate
        : due && !Number.isNaN(due.getTime())
        ? due
        : null,
    paidAt: params.override?.paidAt,
    status: params.override?.status ?? "pending",
    recurrence: params.override?.recurrence ?? (e.recurrence as BillRecurrence | undefined) ?? "one_off",
    contractId: params.override?.contractId ?? null,
    memberId: params.override?.memberId ?? null,
    isHouseholdWide: params.override?.isHouseholdWide ?? false,
    notes: params.override?.notes ?? null,
    source: params.source ?? "ocr",
    extractedText: params.extractedText || null,
    extractionConfidence: e.confidenceScore ?? null,
    rawExtraction: JSON.parse(JSON.stringify(e)) as Prisma.InputJsonValue,
    textExtractionMeta: params.textExtractionMeta
      ? (JSON.parse(JSON.stringify(params.textExtractionMeta)) as Prisma.InputJsonValue)
      : undefined,
  })

  await prisma.billDocument.create({
    data: {
      billId: created.id,
      name: params.originalFilename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      r2Key: params.r2Key,
      extractedText: params.extractedText || null,
      textExtractionMeta: params.textExtractionMeta
        ? (JSON.parse(JSON.stringify(params.textExtractionMeta)) as Prisma.InputJsonValue)
        : undefined,
    },
  })

  return created
}

/** Liste les factures d'un foyer avec le minimum requis pour l'UI. */
export async function listBillsForHousehold(householdId: string, userId: string) {
  await assertHouseholdOwnership(householdId, userId)
  return prisma.bill.findMany({
    where: { householdId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
      contract: { select: { id: true, title: true, provider: true } },
      documents: { select: { id: true } },
    },
  })
}

export async function getBillForOwner(billId: string, userId: string) {
  const bill = await prisma.bill.findFirst({
    where: { id: billId },
    include: {
      household: { select: { ownerId: true } },
      member: true,
      contract: { select: { id: true, title: true, provider: true } },
      documents: true,
      reminders: { orderBy: { dueDate: "asc" } },
    },
  })
  if (!bill || bill.household.ownerId !== userId) return null
  return bill
}
