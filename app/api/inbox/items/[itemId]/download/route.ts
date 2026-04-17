import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDocumentStream } from "@/lib/services/storage"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Non autorisé", { status: 401 })

  const { itemId } = await params
  const item = await prisma.administrativeItem.findFirst({
    where: { id: itemId },
    include: { household: true },
  })
  if (!item || item.household.ownerId !== session.user.id) {
    return new Response("Document introuvable", { status: 404 })
  }

  try {
    const stream = await getDocumentStream(item.r2Key)
    if (!stream) return new Response("Fichier introuvable", { status: 404 })
    const isInline = new URL(req.url).searchParams.get("inline") === "1"
    const headers = new Headers()
    headers.set("Content-Type", item.mimeType)
    headers.set(
      "Content-Disposition",
      `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(item.originalFilename)}"`
    )
    return new Response(stream as unknown as ReadableStream, { headers })
  } catch {
    return new Response("Erreur de lecture", { status: 500 })
  }
}
