import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { analyzeContractDecisionWithLlm } from "@/lib/services/decision-analysis"
import { buildContractCancellationNextLetterUrl } from "@/lib/services/nextletter"

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }
  const { id } = await ctx.params
  const result = await analyzeContractDecisionWithLlm(id, session.user.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error, hint: result.hint }, { status: 422 })
  }
  const c = await prisma.contract.findFirst({
    where: { id, household: { ownerId: session.user.id } },
    select: {
      provider: true,
      policyNumber: true,
      title: true,
      category: true,
      cancellationNoticeDays: true,
      renewalDate: true,
    },
  })
  const nextLetterUrl = buildContractCancellationNextLetterUrl({
    provider: c?.provider,
    policyNumber: c?.policyNumber,
    contractTitle: c?.title ?? c?.provider,
    category: c?.category,
    noticeDays: c?.cancellationNoticeDays,
    renewalDateIso: c?.renewalDate ? c.renewalDate.toISOString().slice(0, 10) : null,
    extraContext: result.insight.nextAction.slice(0, 400),
  })
  return NextResponse.json({
    ok: true,
    insight: result.insight,
    priorityScore: result.priorityScore,
    nextLetterUrl,
  })
}
