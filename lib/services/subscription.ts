import { prisma } from "@/lib/db"

function isActiveStatus(status?: string | null): boolean {
  return status === "active" || status === "trialing"
}

export function isProSubscription(input: {
  status?: string | null
  stripePriceId?: string | null
}): boolean {
  if (!isActiveStatus(input.status)) return false
  const configuredProPrice = process.env.STRIPE_PRO_PRICE_ID
  if (configuredProPrice && input.stripePriceId === configuredProPrice) return true
  return (input.stripePriceId ?? "").toLowerCase().includes("pro")
}

export async function canUseMortgageSimulatorForUser(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, stripePriceId: true },
  })
  return isProSubscription(subscription ?? {})
}

export async function setUserProAccess(userId: string, enabled: boolean) {
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID ?? "pro_manual"
  if (enabled) {
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: "active",
        stripePriceId: proPriceId,
      },
      update: {
        status: "active",
        stripePriceId: proPriceId,
      },
    })
    return
  }
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: "free",
      stripePriceId: null,
    },
    update: {
      status: "free",
      stripePriceId: null,
    },
  })
}
