import { prisma } from "@/lib/db"

export type AppFeatures = {
  mortgageSimulatorEnabled: boolean
  mortgageSimulatorProOnly: boolean
  leaseInsightsEnabled: boolean
  globalSavingsAssistantEnabled: boolean
  optimizerHousingRatioTarget: number
  optimizerTelecomMonthlyTarget: number
  optimizerEnergyMonthlyTarget: number
}

const DEFAULT_FEATURES: AppFeatures = {
  mortgageSimulatorEnabled: true,
  mortgageSimulatorProOnly: true,
  leaseInsightsEnabled: true,
  globalSavingsAssistantEnabled: true,
  optimizerHousingRatioTarget: 35,
  optimizerTelecomMonthlyTarget: 90,
  optimizerEnergyMonthlyTarget: 180,
}

const FEATURES_KEY = "app_features"

function safeParseFeatures(content: string | null | undefined): Partial<AppFeatures> {
  if (!content) return {}
  try {
    const data = JSON.parse(content) as Partial<AppFeatures>
    const numberOrUndefined = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : undefined
    return {
      mortgageSimulatorEnabled:
        typeof data.mortgageSimulatorEnabled === "boolean"
          ? data.mortgageSimulatorEnabled
          : undefined,
      mortgageSimulatorProOnly:
        typeof data.mortgageSimulatorProOnly === "boolean"
          ? data.mortgageSimulatorProOnly
          : undefined,
      leaseInsightsEnabled:
        typeof data.leaseInsightsEnabled === "boolean"
          ? data.leaseInsightsEnabled
          : undefined,
      globalSavingsAssistantEnabled:
        typeof data.globalSavingsAssistantEnabled === "boolean"
          ? data.globalSavingsAssistantEnabled
          : undefined,
      optimizerHousingRatioTarget: numberOrUndefined(data.optimizerHousingRatioTarget),
      optimizerTelecomMonthlyTarget: numberOrUndefined(data.optimizerTelecomMonthlyTarget),
      optimizerEnergyMonthlyTarget: numberOrUndefined(data.optimizerEnergyMonthlyTarget),
    }
  } catch {
    return {}
  }
}

export async function getAppFeatures(): Promise<AppFeatures> {
  const row = await prisma.promptTemplate.findUnique({
    where: { key: FEATURES_KEY },
    select: { content: true },
  })
  return {
    ...DEFAULT_FEATURES,
    ...safeParseFeatures(row?.content),
  }
}

export async function updateAppFeatures(patch: Partial<AppFeatures>): Promise<AppFeatures> {
  const current = await getAppFeatures()
  const next: AppFeatures = {
    ...current,
    ...patch,
  }
  await prisma.promptTemplate.upsert({
    where: { key: FEATURES_KEY },
    create: {
      key: FEATURES_KEY,
      name: "Application Features",
      content: JSON.stringify(next),
      isActive: true,
      version: 1,
    },
    update: {
      content: JSON.stringify(next),
      isActive: true,
      version: { increment: 1 },
    },
  })
  return next
}
