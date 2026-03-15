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

  const body = (await request.json()) as { userId?: string; isPro?: boolean }
  if (!body.userId || typeof body.isPro !== "boolean") {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 })
  }

  await setUserProAccess(body.userId, body.isPro)
  return NextResponse.json({ ok: true })
}
