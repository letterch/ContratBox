import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    include: {
      contracts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          provider: true,
          contractType: true,
          category: true,
        },
      },
    },
  })

  const contracts = (household?.contracts ?? []).map((c) => ({
    id: c.id,
    name: c.title || c.provider || c.contractType || "Contrat",
    category: c.category,
  }))

  return NextResponse.json({ contracts })
}
