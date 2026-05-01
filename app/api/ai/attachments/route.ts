import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { extractTextFromFile } from "@/lib/services/ocr"

const MAX_BYTES = 12 * 1024 * 1024
const MAX_ATTACHMENTS_PER_HOUSEHOLD = 24
const MAX_FILES_PER_REQUEST = 12

function minExtractedChars(): number {
  const n = Number(process.env.AI_ATTACHMENT_MIN_EXTRACT_CHARS ?? "22")
  return Number.isFinite(n) ? Math.max(12, Math.min(500, Math.floor(n))) : 22
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!household) {
    return NextResponse.json({ attachments: [] })
  }

  const rows = await prisma.aiAssistantAttachment.findMany({
    where: { householdId: household.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      label: true,
      mimeType: true,
      kind: true,
      createdAt: true,
      extractedText: true,
    },
  })

  const attachments = rows.map((r) => ({
    id: r.id,
    label: r.label,
    mimeType: r.mimeType,
    kind: r.kind,
    createdAt: r.createdAt.toISOString(),
    excerpt: (r.extractedText ?? "").slice(0, 160).trim().replace(/\s+/g, " ") + ((r.extractedText?.length ?? 0) > 160 ? "…" : ""),
    charCount: (r.extractedText ?? "").length,
  }))

  return NextResponse.json({ attachments })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!household) {
    return NextResponse.json({ error: "Ménage introuvable" }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 })
  }

  const fromMulti = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0)
  const legacySingle = formData.get("file")
  const files: File[] =
    fromMulti.length > 0
      ? fromMulti.slice(0, MAX_FILES_PER_REQUEST)
      : legacySingle instanceof File && legacySingle.size > 0
        ? [legacySingle]
        : []

  if (files.length === 0) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })
  }

  const kindRaw = String(formData.get("kind") ?? "proposal").trim()
  const kind = ["proposal", "policy", "other"].includes(kindRaw) ? kindRaw : "proposal"
  const batchPrefix = String(formData.get("batchPrefix") ?? "").trim().slice(0, 120)

  const minChars = minExtractedChars()
  const attachmentsOut: Array<{
    id: string
    label: string
    mimeType: string
    kind: string
    createdAt: string
    charCount: number
    excerpt: string
  }> = []
  const errorsOut: Array<{ name: string; error: string }> = []

  const trimEvictOldest = async () => {
    while (
      (await prisma.aiAssistantAttachment.count({ where: { householdId: household.id } })) >= MAX_ATTACHMENTS_PER_HOUSEHOLD
    ) {
      const oldest = await prisma.aiAssistantAttachment.findFirst({
        where: { householdId: household.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
      if (!oldest) break
      await prisma.aiAssistantAttachment.delete({ where: { id: oldest.id } })
    }
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.size > MAX_BYTES) {
      errorsOut.push({ name: file.name, error: "Fichier trop volumineux (max 12 Mo)" })
      continue
    }
    const mimeType = file.type || "application/octet-stream"
    if (!ALLOWED_MIME.has(mimeType)) {
      errorsOut.push({
        name: file.name,
        error: "Format non pris en charge (PDF, JPG, PNG, WebP)",
      })
      continue
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { text: extractedText, meta: textExtractionMeta } = await extractTextFromFile(buffer, mimeType, {
      aggressivePdfOcr: true,
    })
    const trimmed = extractedText.trim()
    if (!trimmed || trimmed.length < minChars) {
      errorsOut.push({
        name: file.name,
        error:
          "Peu ou pas de texte extrait. Pour un PDF constitué d’images, essayez OCR_MODE=always côté serveur ou un fichier plus net. Vérifiez aussi que le document n’est pas vide ou protégé.",
      })
      continue
    }

    await trimEvictOldest()

    const defaultLabel = String(formData.get("label") ?? "").trim()
    const partLabel =
      batchPrefix && files.length > 1
        ? `${batchPrefix} · partie ${i + 1} — ${file.name}`
        : batchPrefix && files.length === 1
          ? `${batchPrefix} — ${file.name}`
          : defaultLabel || file.name || "document"
    const label = partLabel.slice(0, 240)

    const row = await prisma.aiAssistantAttachment.create({
      data: {
        householdId: household.id,
        createdById: session.user.id,
        label,
        mimeType,
        kind,
        extractedText: trimmed.slice(0, 950_000),
        textExtractionMeta: textExtractionMeta ? (textExtractionMeta as object) : undefined,
      },
      select: {
        id: true,
        label: true,
        mimeType: true,
        kind: true,
        createdAt: true,
      },
    })

    attachmentsOut.push({
      ...row,
      createdAt: row.createdAt.toISOString(),
      charCount: trimmed.length,
      excerpt: trimmed.slice(0, 160).replace(/\s+/g, " ") + (trimmed.length > 160 ? "…" : ""),
    })
  }

  if (attachmentsOut.length === 0 && errorsOut.length > 0) {
    const first = errorsOut[0]
    return NextResponse.json(
      files.length === 1
        ? { error: first.error }
        : { error: first.error, errors: errorsOut },
      { status: 422 }
    )
  }

  const payload: Record<string, unknown> = {
    attachments: attachmentsOut,
  }
  if (errorsOut.length) payload.errors = errorsOut
  if (attachmentsOut.length === 1) {
    payload.attachment = attachmentsOut[0]
  }

  return NextResponse.json(payload)
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get("id")?.trim()
  if (!id) {
    return NextResponse.json({ error: "id manquant" }, { status: 400 })
  }

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!household) {
    return NextResponse.json({ error: "Ménage introuvable" }, { status: 404 })
  }

  const deleted = await prisma.aiAssistantAttachment.deleteMany({
    where: { id, householdId: household.id },
  })
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Pièce introuvable" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
