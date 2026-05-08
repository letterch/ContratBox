import { prisma } from "@/lib/db"
import { requirePlanModule } from "@/lib/guards/require-access"
import { listBillsForHousehold, countActiveBills } from "@/lib/services/bills"
import { buildBillRows, buildBillsPortfolioSummary } from "@/lib/services/bills-analytics"
import { syncBillRemindersForHousehold } from "@/lib/services/reminder-sync"
import { accessCanAddBill } from "@/lib/services/access-context"
import { ensureInboundEmailToken, buildInboundEmailAddress } from "@/lib/services/inbound-email"
import { BillsListClient } from "@/components/bills/bills-list-client"

export default async function BillsPage() {
  const { session, ctx } = await requirePlanModule("module_bills")
  if (!ctx.household) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Vous devez d'abord créer un foyer pour utiliser le module factures.
      </div>
    )
  }

  await syncBillRemindersForHousehold(ctx.household.id).catch(() => null)
  const inboundToken = await ensureInboundEmailToken(session.user.id).catch(() => null)

  const [bills, members, contracts, count] = await Promise.all([
    listBillsForHousehold(ctx.household.id, session.user.id),
    prisma.householdMember.findMany({
      where: { householdId: ctx.household.id },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.contract.findMany({
      where: { householdId: ctx.household.id, status: "active" },
      orderBy: { title: "asc" },
      select: { id: true, title: true, provider: true },
    }),
    countActiveBills(ctx.household.id),
  ])

  const rows = buildBillRows(bills)
  const summary = buildBillsPortfolioSummary(bills)

  return (
    <BillsListClient
      bills={rows}
      summary={summary}
      members={members}
      contracts={contracts}
      canAdd={accessCanAddBill(ctx)}
      count={count}
      limit={ctx.entitlements.quotas.maxBills}
      moduleEnabled
      inboundEmail={inboundToken ? buildInboundEmailAddress(inboundToken) : null}
    />
  )
}
