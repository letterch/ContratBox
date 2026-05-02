"use client"

import { useMemo, useState } from "react"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { AlertPanel } from "@/components/dashboard/alert-panel"
import { FamilyTabs } from "@/components/dashboard/family-tabs"
import { CategoryGrid } from "@/components/dashboard/category-grid"
import { RecentContracts } from "@/components/dashboard/recent-contracts"
import { CostInsightsPanel } from "@/components/dashboard/cost-insights"
import { TasksPreview } from "@/components/dashboard/tasks-preview"
import { TimelinePreview } from "@/components/dashboard/timeline-preview"
import { TopActionsBlock } from "@/components/decision/top-actions-block"
import { RemindersPanel } from "@/components/dashboard/reminders-panel"
import type { TimelineEvent } from "@/lib/services/reminder-timeline"
import type { ActionableRecommendation, NextStepBannerPayload } from "@/lib/services/recommendation-engine"
import type { PendingReminderLite } from "@/lib/services/reminder-sync"

type DashboardPayload = {
  totals?: { monthly?: number; annual?: number }
  household?: {
    contractCount?: number
    members?: { id: string; firstName: string; lastName?: string | null }[]
  }
  costInsights?: unknown
  contracts?: Array<{
    id: string
    memberId?: string | null
    isHouseholdWide?: boolean
    /** Prisma peut renvoyer Decimal côté serveur */
    premiumAmount?: number | null | { toNumber(): number }
    premiumFrequency?: string | null
  }>
  recentContracts?: Array<{ id: string; memberId?: string | null; isHouseholdWide?: boolean }>
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

export function DashboardContent({ data }: { data: DashboardPayload | null }) {
  const [activeMemberId, setActiveMemberId] = useState("all")

  const filteredContractIds = useMemo(() => {
    const contracts = data?.contracts ?? []
    const visible = contracts.filter((c) => {
      if (activeMemberId === "all") return true
      return c.memberId === activeMemberId || c.isHouseholdWide
    })
    return new Set(visible.map((c) => c.id))
  }, [activeMemberId, data?.contracts])

  const filteredContracts = useMemo(
    () => (data?.contracts ?? []).filter((c) => filteredContractIds.has(c.id)),
    [data?.contracts, filteredContractIds]
  )

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

  const totals = useMemo(() => {
    let monthly = 0
    let annual = 0
    for (const c of filteredContracts) {
      const amount = Number(c.premiumAmount ?? 0)
      if (!Number.isFinite(amount) || amount <= 0) continue
      if (c.premiumFrequency === "annual") annual += amount
      else monthly += amount
    }
    return { monthly, annual }
  }, [filteredContracts])

  const filteredTopActions = useMemo(() => {
    const all = data?.topActions ?? []
    if (activeMemberId === "all") return all
    return all.filter((a) => {
      const m = a.ctaHref.match(/\/contracts\/([^/?]+)/)
      if (!m) return true
      return filteredContractIds.has(m[1])
    })
  }, [data?.topActions, activeMemberId, filteredContractIds])

  return (
    <>
      <SummaryCards
        monthlyTotal={totals.monthly}
        annualTotal={totals.annual}
        contractCount={filteredContracts.length}
        alertCount={cancellationContracts.length}
      />
      <TopActionsBlock actions={filteredTopActions} />
      <RemindersPanel reminders={(data?.pendingReminders ?? []) as Parameters<typeof RemindersPanel>[0]["reminders"]} />
      <CostInsightsPanel insights={data?.costInsights as Parameters<typeof CostInsightsPanel>[0]["insights"]} />
      {!!data?.taskPreview?.length && <TasksPreview tasks={data.taskPreview} />}
      {!!data?.timelinePreview?.length && <TimelinePreview events={data.timelinePreview} />}
      {!!data?.realEstate && (data.realEstate.monthlyIncome > 0 || data.realEstate.monthlyCharges > 0) && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Vue immobilière</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenus loyers</p>
              <p className="text-base font-semibold text-[oklch(0.56_0.15_162)]">CHF {data.realEstate.monthlyIncome.toLocaleString("fr-CH")}/mois</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Charges immo</p>
              <p className="text-base font-semibold text-[oklch(0.57_0.20_25)]">CHF {data.realEstate.monthlyCharges.toLocaleString("fr-CH")}/mois</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net immobilier</p>
              <p className="text-base font-semibold text-foreground">CHF {data.realEstate.netMonthly.toLocaleString("fr-CH")}/mois</p>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <FamilyTabs
            members={data?.household?.members}
            contracts={data?.contracts as Parameters<typeof FamilyTabs>[0]["contracts"]}
            activeId={activeMemberId}
            onChange={setActiveMemberId}
          />
          <CategoryGrid contracts={filteredContracts as Parameters<typeof CategoryGrid>[0]["contracts"]} />
        </div>
        <AlertPanel
          cancellationContracts={cancellationContracts as Parameters<typeof AlertPanel>[0]["cancellationContracts"]}
          renewalContracts={renewalContracts as Parameters<typeof AlertPanel>[0]["renewalContracts"]}
          mortgageAlerts={mortgageAlerts as Parameters<typeof AlertPanel>[0]["mortgageAlerts"]}
        />
      </div>
      <RecentContracts contracts={filteredRecent as Parameters<typeof RecentContracts>[0]["contracts"]} />
    </>
  )
}
