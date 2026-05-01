import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { extractTextFromFile } from "@/lib/services/ocr"

const MAX_BYTES = 12 * 1024 * 1024
const MAX_ATTACHMENTS_PER_HOUSEHOLD = 24

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

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 12 Mo)" }, { status: 400 })
  }

  const mimeType = file.type || "application/octet-stream"
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ error: "Format non pris en charge (PDF, JPG, PNG, WebP)" }, { status: 400 })
  }

  const kindRaw = String(formData.get("kind") ?? "proposal").trim()
  const kind = ["proposal", "policy", "other"].includes(kindRaw) ? kindRaw : "proposal"

  const buffer = Buffer.from(await file.arrayBuffer())
  const { text: extractedText, meta: textExtractionMeta } = await extractTextFromFile(buffer, mimeType)
  const trimmed = extractedText.trim()
  if (!trimmed || trimmed.length < 40) {
    return NextResponse.json(
      {
        error:
          "Peu ou pas de texte extrait (PDF scanné faible qualité ou image vide). Réessayez avec un PDF texte ou une image plus nette.",
      },
      { status: 422 }
    )
  }

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

  const label = String(formData.get("label") ?? file.name ?? "document").slice(0, 240)

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

  return NextResponse.json({
    attachment: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      charCount: trimmed.length,
      excerpt: trimmed.slice(0, 160).replace(/\s+/g, " ") + (trimmed.length > 160 ? "…" : ""),
    },
  })
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
