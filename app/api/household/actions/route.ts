import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/app/actions/dashboard"

/** Actions prioritaires (économies) pour intégrations / clients légers */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const data = await getDashboardData()
  if (!data) {
    return NextResponse.json({ topActions: [], nextStepBanner: null, triggerCount: 0 })
  }

  return NextResponse.json({
    topActions: data.topActions ?? [],
    nextStepBanner: data.nextStepBanner ?? null,
    triggerCount: data.decisionTriggerEvents?.length ?? 0,
    estimatedAnnualSavingsChf: Math.round((data.costInsights?.potentialSavingsMonthly ?? 0) * 12),
  })
}
