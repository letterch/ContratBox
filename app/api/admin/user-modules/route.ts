import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PLAN_FEATURE_KEYS } from "@/lib/config/plans"

function forbidden() {
  return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return forbidden()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim().toLowerCase() ?? ""
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { select: { status: true, stripePriceId: true } },
      _count: { select: { contracts: true, bills: true } },
    },
  })
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      extraModules: u.extraModules,
      aiQuotaOverride: u.aiQuotaOverride,
      contracts: u._count.contracts,
      bills: u._count.bills,
      subscriptionStatus: u.subscription?.status ?? "free",
      subscriptionPriceId: u.subscription?.stripePriceId ?? null,
    })),
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return forbidden()
  const body = (await request.json()) as {
    userId?: string
    extraModules?: string[]
    aiQuotaOverride?: number | null
  }
  if (!body.userId) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 })
  }
  const cleanedModules = Array.isArray(body.extraModules)
    ? body.extraModules.filter((m): m is string =>
        typeof m === "string" && (PLAN_FEATURE_KEYS as readonly string[]).includes(m)
      )
    : undefined
  await prisma.user.update({
    where: { id: body.userId },
    data: {
      extraModules: cleanedModules,
      aiQuotaOverride:
        body.aiQuotaOverride === null
          ? null
          : typeof body.aiQuotaOverride === "number" && body.aiQuotaOverride > 0
          ? body.aiQuotaOverride
          : undefined,
    },
  })
  return NextResponse.json({ ok: true })
}
