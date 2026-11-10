"use client"

import { useMemo, useState } from "react"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { AlertPanel } from "@/components/dashboard/alert-panel"
import { CategoryGrid } from "@/components/dashboard/category-grid"
import { RecentContracts } from "@/components/dashboard/recent-contracts"
import { CostInsightsPanel } from "@/components/dashboard/cost-insights"
import { TasksPreview } from "@/components/dashboard/tasks-preview"
import { TimelinePreview } from "@/components/dashboard/timeline-preview"
import { TopActionsBlock } from "@/components/decision/top-actions-block"
import { RemindersPanel } from "@/components/dashboard/reminders-panel"
import { DashboardEngagementStrip } from "@/components/dashboard/dashboard-engagement-strip"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"
import { DashboardReset } from "@/components/dashboard/dashboard-reset"
import { PremiumTrend } from "@/components/dashboard/premium-trend"
import type { TimelineEvent } from "@/lib/services/reminder-timeline"
import type { ActionableRecommendation, NextStepBannerPayload } from "@/lib/services/recommendation-engine"
import type { PendingReminderLite } from "@/lib/services/reminder-sync"
import type { BudgetCashflow } from "@/lib/services/budget-engine"
import type { PremiumYearPoint } from "@/lib/services/premium-history"
import {
  DASHBOARD_CATEGORY_GROUPS,
  contractMatchesCategoryGroup,
  monthlyPremiumOf,
  type DashboardCategoryGroupId,
} from "@/lib/config/dashboard-filters"
import Link from "next/link"

type ContractRow = {
  id: string
  memberId?: string | null
  isHouseholdWide?: boolean
  category?: string | null
  premiumAmount?: number | null | { toNumber(): number }
  premiumFrequency?: string | null
  rawExtraction?: unknown
  provider?: string | null
  title?: string | null
}

type DashboardPayload = {
  totals?: { monthly?: number; annual?: number }
  cashflow?: BudgetCashflow
  premiumTrend?: PremiumYearPoint[]
  household?: {
    contractCount?: number
    members?: { id: string; firstName: string; lastName?: string | null }[]
  }
  costInsights?: unknown
  contracts?: ContractRow[]
  recentContracts?: ContractRow[]
  contractsInCancellationWindow?: Array<{ id: string }>
  contractsNearingRenewal?: Array<{ id: string }>
  mortgageAlerts?: Array<{ id: string; contractId: string }>
  realEstate?: { monthlyIncome: number; monthlyCharges: number; netMonthly: number }
  taskPreview?: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: Date | null
  }>
  timelinePreview?: TimelineEvent[]
  topActions?: ActionableRecommendation[]
  nextStepBanner?: NextStepBannerPayload
  pendingReminders?: (PendingReminderLite & { dueDate: Date | string })[]
}

function matchesScope(c: ContractRow, scope: string): boolean {
  if (scope === "all") return true
  if (scope === "household") return Boolean(c.isHouseholdWide) || !c.memberId
  // Personne seule : uniquement les contrats assignés à ce membre
  return c.memberId === scope
}

export function DashboardContent({ data }: { data: DashboardPayload | null }) {
  const [scope, setScope] = useState("all")
  const [categoryGroup, setCategoryGroup] = useState<DashboardCategoryGroupId>("all")
  const members = data?.household?.members ?? []
  const allContracts = data?.contracts ?? []

  const filteredContracts = useMemo(() => {
    return allContracts.filter(
      (c) => matchesScope(c, scope) && contractMatchesCategoryGroup(c.category, categoryGroup)
    )
  }, [allContracts, scope, categoryGroup])

  const filteredContractIds = useMemo(
    () => new Set(filteredContracts.map((c) => c.id)),
    [filteredContracts]
  )

  const scopeTotals = useMemo(() => {
    const out: Record<string, { monthly: number; count: number }> = {
      all: { monthly: 0, count: 0 },
      household: { monthly: 0, count: 0 },
    }
    for (const m of members) out[m.id] = { monthly: 0, count: 0 }

    for (const c of allContracts) {
      if (!contractMatchesCategoryGroup(c.category, categoryGroup)) continue
      const monthly = monthlyPremiumOf(c)
      out.all.monthly += monthly
      out.all.count += 1
      if (c.isHouseholdWide || !c.memberId) {
        out.household.monthly += monthly
        out.household.count += 1
      }
      if (c.memberId && out[c.memberId]) {
        out[c.memberId].monthly += monthly
        out[c.memberId].count += 1
      }
    }
    return out
  }, [allContracts, members, categoryGroup])

  const groupTotals = useMemo(() => {
    const out: Record<string, { monthly: number; count: number }> = {}
    for (const id of Object.keys(DASHBOARD_CATEGORY_GROUPS) as DashboardCategoryGroupId[]) {
      out[id] = { monthly: 0, count: 0 }
    }
    for (const c of allContracts) {
      if (!matchesScope(c, scope)) continue
      const monthly = monthlyPremiumOf(c)
      out.all.monthly += monthly
      out.all.count += 1
      for (const id of Object.keys(DASHBOARD_CATEGORY_GROUPS) as DashboardCategoryGroupId[]) {
        if (id === "all") continue
        if (contractMatchesCategoryGroup(c.category, id)) {
          out[id].monthly += monthly
          out[id].count += 1
        }
      }
    }
    return out
  }, [allContracts, scope])

  const totals = useMemo(() => {
    let monthly = 0
    for (const c of filteredContracts) monthly += monthlyPremiumOf(c)
    return { monthly, annual: monthly * 12 }
  }, [filteredContracts])

  const filteredRecent = useMemo(
    () => (data?.recentContracts ?? []).filter((c) => filteredContractIds.has(c.id)),
    [data?.recentContracts, filteredContractIds]
  )
  const cancellationContracts = useMemo(
    () => (data?.contractsInCancellationWindow ?? []).filter((c) => filteredContractIds.has(c.id)),
    [data?.contractsInCancellationWindow, filteredContractIds]
  )
  const renewalContracts = useMemo(
    () => (data?.contractsNearingRenewal ?? []).filter((c) => filteredContractIds.has(c.id)),
    [data?.contractsNearingRenewal, filteredContractIds]
  )
  const mortgageAlerts = useMemo(
    () => (data?.mortgageAlerts ?? []).filter((a) => filteredContractIds.has(a.contractId)),
    [data?.mortgageAlerts, filteredContractIds]
  )
  const filteredTopActions = useMemo(() => {
    const all = data?.topActions ?? []
    if (scope === "all" && categoryGroup === "all") return all
    return all.filter((a) => {
      const m = a.ctaHref.match(/\/contracts\/([^/?]+)/)
      if (!m) return true
      return filteredContractIds.has(m[1])
    })
  }, [data?.topActions, scope, categoryGroup, filteredContractIds])

  const cashflow = data?.cashflow
  const filterLabel =
    scope === "all"
      ? "ménage"
      : scope === "household"
        ? "foyer"
        : members.find((m) => m.id === scope)?.firstName ?? "membre"
  const groupLabel = DASHBOARD_CATEGORY_GROUPS[categoryGroup].label

  return (
    <>
      <DashboardFilters
        members={members}
        scope={scope}
        onScopeChange={setScope}
        categoryGroup={categoryGroup}
        onCategoryGroupChange={setCategoryGroup}
        scopeTotals={scopeTotals}
        groupTotals={groupTotals}
      />

      <SummaryCards
        monthlyTotal={totals.monthly}
        annualTotal={totals.annual}
        contractCount={filteredContracts.length}
        alertCount={cancellationContracts.length}
      />

      <p className="text-xs text-muted-foreground -mt-2">
        Totaux pour <span className="font-medium text-foreground">{filterLabel}</span>
        {categoryGroup !== "all" ? (
          <>
            {" "}
            · <span className="font-medium text-foreground">{groupLabel}</span>
          </>
        ) : null}
        : CHF {totals.monthly.toLocaleString("fr-CH")}/mois
      </p>

      {cashflow && scope === "all" && categoryGroup === "all" ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Cashflow ménage</h3>
            <Link href="/budget" className="text-xs text-primary hover:underline">
              Voir le budget
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenus</p>
              <p className="text-sm font-semibold">CHF {cashflow.incomeMonthly.toLocaleString("fr-CH")}/mois</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Primes</p>
              <p className="text-sm font-semibold">CHF {cashflow.premiumsMonthly.toLocaleString("fr-CH")}/mois</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Factures</p>
              <p className="text-sm font-semibold">CHF {cashflow.billsMonthly.toLocaleString("fr-CH")}/mois</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net</p>
              <p
                className={`text-sm font-semibold ${cashflow.netMonthly < 0 ? "text-destructive" : "text-[oklch(0.56_0.15_162)]"}`}
              >
                CHF {cashflow.netMonthly.toLocaleString("fr-CH")}/mois
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <PremiumTrend points={data?.premiumTrend ?? []} />

      <DashboardEngagementStrip />
      <TopActionsBlock actions={filteredTopActions} />
      <RemindersPanel
        reminders={(data?.pendingReminders ?? []) as Parameters<typeof RemindersPanel>[0]["reminders"]}
      />
      <CostInsightsPanel insights={data?.costInsights as Parameters<typeof CostInsightsPanel>[0]["insights"]} />
      {!!data?.taskPreview?.length && <TasksPreview tasks={data.taskPreview} />}
      {!!data?.timelinePreview?.length && <TimelinePreview events={data.timelinePreview} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <CategoryGrid contracts={filteredContracts as Parameters<typeof CategoryGrid>[0]["contracts"]} />
        </div>
        <AlertPanel
          cancellationContracts={cancellationContracts as Parameters<typeof AlertPanel>[0]["cancellationContracts"]}
          renewalContracts={renewalContracts as Parameters<typeof AlertPanel>[0]["renewalContracts"]}
          mortgageAlerts={mortgageAlerts as Parameters<typeof AlertPanel>[0]["mortgageAlerts"]}
        />
      </div>
      <RecentContracts contracts={filteredRecent as Parameters<typeof RecentContracts>[0]["contracts"]} />

      <DashboardReset contractCount={allContracts.length} />
    </>
  )
}
