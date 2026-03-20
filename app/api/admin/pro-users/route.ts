import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isProSubscription, setUserProAccess } from "@/lib/services/subscription"

function forbidden() {
  return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return forbidden()

  const users = await prisma.user.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      _count: { select: { contracts: true } },
    },
  })

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isOwner: u.isOwner,
      isTenant: u.isTenant,
      createdAt: u.createdAt,
      contracts: u._count.contracts,
      isPro: isProSubscription({
        status: u.subscription?.status,
        stripePriceId: u.subscription?.stripePriceId,
      }),
      subscriptionStatus: u.subscription?.status ?? "free",
    })),
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return forbidden()

  const body = (await request.json()) as {
    userId?: string
    isPro?: boolean
    isOwner?: boolean
    isTenant?: boolean
    isAdmin?: boolean
  }
  if (!body.userId) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 })
  }

  if (typeof body.isPro === "boolean") {
    await setUserProAccess(body.userId, body.isPro)
  }
  await prisma.user.update({
    where: { id: body.userId },
    data: {
      isOwner: typeof body.isOwner === "boolean" ? body.isOwner : undefined,
      isTenant: typeof body.isTenant === "boolean" ? body.isTenant : undefined,
      role: typeof body.isAdmin === "boolean" ? (body.isAdmin ? "admin" : "user") : undefined,
    },
  })
  return NextResponse.json({ ok: true })
}
