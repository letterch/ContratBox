import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAppFeatures, updateAppFeatures } from "@/lib/services/feature-flags"

function forbidden() {
  return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return forbidden()
  const features = await getAppFeatures()
  return NextResponse.json({ features })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") return forbidden()
  const body = (await request.json()) as Partial<{
    mortgageSimulatorEnabled: boolean
    mortgageSimulatorProOnly: boolean
    leaseInsightsEnabled: boolean
    globalSavingsAssistantEnabled: boolean
    optimizerHousingRatioTarget: number
    optimizerTelecomMonthlyTarget: number
    optimizerEnergyMonthlyTarget: number
  }>
  const numberOrUndefined = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined
  const features = await updateAppFeatures({
    mortgageSimulatorEnabled:
      typeof body.mortgageSimulatorEnabled === "boolean"
        ? body.mortgageSimulatorEnabled
        : undefined,
    mortgageSimulatorProOnly:
      typeof body.mortgageSimulatorProOnly === "boolean"
        ? body.mortgageSimulatorProOnly
        : undefined,
    leaseInsightsEnabled:
      typeof body.leaseInsightsEnabled === "boolean"
        ? body.leaseInsightsEnabled
        : undefined,
    globalSavingsAssistantEnabled:
      typeof body.globalSavingsAssistantEnabled === "boolean"
        ? body.globalSavingsAssistantEnabled
        : undefined,
    optimizerHousingRatioTarget: numberOrUndefined(body.optimizerHousingRatioTarget),
    optimizerTelecomMonthlyTarget: numberOrUndefined(body.optimizerTelecomMonthlyTarget),
    optimizerEnergyMonthlyTarget: numberOrUndefined(body.optimizerEnergyMonthlyTarget),
  })
  return NextResponse.json({ ok: true, features })
}
