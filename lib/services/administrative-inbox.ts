import { prisma } from "@/lib/db"
import { uploadDocument, inboxObjectKey, isStorageConfigured } from "@/lib/services/storage"
import { extractTextFromFile } from "@/lib/services/ocr"
import { extractAdministrativeDocument } from "@/lib/services/inbox-extraction"
import { extractContractData } from "@/lib/services/extraction"
import { createHouseholdTask } from "@/lib/services/household-task"
import type { HouseholdTaskPriority } from "@/lib/types/household-task"
import type { Prisma } from "@prisma/client"

export async function countActiveInboxItems(householdId: string): Promise<number> {
  return prisma.administrativeItem.count({
    where: { householdId, status: "active" },
  })
}

export async function listAdministrativeItems(householdId: string, userId: string, take = 50) {
  const h = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
    select: { id: true },
  })
  if (!h) throw new Error("Ménage introuvable")
  return prisma.administrativeItem.findMany({
    where: { householdId, status: "active" },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      derivedTask: { select: { id: true, title: true, status: true } },
    },
  })
}

export async function getAdministrativeItemForOwner(itemId: string, userId: string) {
  const item = await prisma.administrativeItem.findFirst({
    where: { id: itemId },
    include: { household: { select: { ownerId: true } } },
  })
  if (!item || item.household.ownerId !== userId) return null
  return item
}

export type UploadInboxResult =
  | {
      ok: true
      itemId: string
      extractedText: string
      extraction: Awaited<ReturnType<typeof extractAdministrativeDocument>>
    }
  | { ok: false; error: string }

export async function uploadAndAnalyzeInboxItem(
  userId: string,
  householdId: string,
  file: File
): Promise<UploadInboxResult> {
  if (!isStorageConfigured()) {
    return { ok: false, error: "Stockage fichier non configuré (R2)." }
  }
  const h = await prisma.household.findFirst({
    where: { id: householdId, ownerId: userId },
    select: { id: true },
  })
  if (!h) return { ok: false, error: "Ménage introuvable" }

  if (!file || file.size === 0) return { ok: false, error: "Fichier manquant" }
  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || "application/pdf"

  const { text: extractedText } = await extractTextFromFile(buffer, mimeType)
  const extraction = await extractAdministrativeDocument(extractedText || "")

  const r2Key = inboxObjectKey(userId, file.name)
  try {
    await uploadDocument(r2Key, buffer, mimeType)
  } catch {
    return { ok: false, error: "Échec upload du fichier." }
  }

  const dueDate = extraction.dueDate ? new Date(extraction.dueDate) : null
  const item = await prisma.administrativeItem.create({
    data: {
      householdId,
      createdById: userId,
      originalFilename: file.name,
      mimeType,
      sizeBytes: file.size,
      r2Key,
      classification: extraction.classification ?? "other",
      urgency: extraction.urgency ?? "medium",
      summary: extraction.summary ?? null,
      recommendedAction: extraction.recommendedAction ?? null,
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
      extractedText: extractedText || null,
      extractionConfidence:
        extraction.confidenceScore != null ? extraction.confidenceScore : null,
      rawExtraction: JSON.parse(JSON.stringify(extraction)) as Prisma.InputJsonValue,
    },
  })

  return { ok: true, itemId: item.id, extractedText: extractedText || "", extraction }
}

export async function archiveAdministrativeItem(itemId: string, userId: string) {
  const item = await getAdministrativeItemForOwner(itemId, userId)
  if (!item) throw new Error("Document introuvable")
  return prisma.administrativeItem.update({
    where: { id: itemId },
    data: { status: "archived" },
  })
}

export async function createTaskFromInboxItem(itemId: string, userId: string, householdId: string) {
  const item = await prisma.administrativeItem.findFirst({
    where: { id: itemId, householdId, status: "active" },
    include: { household: { select: { ownerId: true } } },
  })
  if (!item || item.household.ownerId !== userId) throw new Error("Document introuvable")
  const title =
    item.summary?.slice(0, 80) ||
    item.recommendedAction?.slice(0, 80) ||
    `Suivi : ${item.originalFilename}`
  const priorityMap: Record<string, HouseholdTaskPriority> = {
    critical: "urgent",
    high: "high",
    medium: "medium",
    low: "low",
  }
  const priority = item.urgency ? priorityMap[item.urgency] ?? "medium" : "medium"
  const task = await createHouseholdTask({
    householdId,
    createdById: userId,
    title: title.length > 5 ? title : `Tâche inbox : ${item.originalFilename}`,
    description: [item.summary, item.recommendedAction].filter(Boolean).join("\n\n") || null,
    priority,
    dueDate: item.dueDate,
    sourceAdministrativeItemId: item.id,
  })
  return task
}

export async function getInboxItemContractSeed(itemId: string, userId: string) {
  const item = await prisma.administrativeItem.findFirst({
    where: { id: itemId, status: "active" },
    include: { household: { select: { ownerId: true } } },
  })
  if (!item || item.household.ownerId !== userId) {
    throw new Error("Document inbox introuvable")
  }

  const text = item.extractedText?.trim() || ""
  const extracted = await extractContractData(
    text || "(Document administratif sans texte exploitable — vérification manuelle nécessaire.)"
  )

  return {
    sourceAdministrativeItemId: item.id,
    file: {
      r2Key: item.r2Key,
      name: item.originalFilename,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
    },
    extracted,
    extractedText: text,
  }
}

export async function markAdministrativeItemConverted(
  itemId: string,
  contractId: string,
  userId: string
) {
  const item = await prisma.administrativeItem.findFirst({
    where: { id: itemId },
    include: { household: { select: { ownerId: true } } },
  })
  if (!item || item.household.ownerId !== userId) {
    throw new Error("Document inbox introuvable")
  }
  await prisma.administrativeItem.update({
    where: { id: itemId },
    data: {
      convertedToContractId: contractId,
      convertedAt: new Date(),
      status: "archived",
    },
  })
}
