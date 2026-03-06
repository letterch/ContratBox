import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDocumentStream } from "@/lib/services/storage"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Non autorisé", { status: 401 })

  const { documentId } = await params
  const doc = await prisma.document.findFirst({
    where: { id: documentId },
    include: { contract: { include: { household: true } } },
  })
  if (!doc || doc.contract.household.ownerId !== session.user.id) {
    return new Response("Document introuvable", { status: 404 })
  }

  try {
    const stream = await getDocumentStream(doc.r2Key)
    if (!stream) return new Response("Fichier introuvable", { status: 404 })
    const headers = new Headers()
    headers.set("Content-Type", doc.mimeType)
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.name)}"`)
    return new Response(stream as unknown as ReadableStream, { headers })
  } catch {
    return new Response("Erreur de lecture", { status: 500 })
  }
}
