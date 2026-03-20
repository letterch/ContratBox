"use client"

import { useMemo, useState } from "react"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { AlertPanel } from "@/components/dashboard/alert-panel"
import { FamilyTabs } from "@/components/dashboard/family-tabs"
import { CategoryGrid } from "@/components/dashboard/category-grid"
import { RecentContracts } from "@/components/dashboard/recent-contracts"
import { CostInsightsPanel } from "@/components/dashboard/cost-insights"

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
    premiumAmount?: number | null
    premiumFrequency?: string | null
  }>
  recentContracts?: Array<{ id: string; memberId?: string | null; isHouseholdWide?: boolean }>
  contractsInCancellationWindow?: Array<{ id: string }>
  contractsNearingRenewal?: Array<{ id: string }>
  mortgageAlerts?: Array<{ id: string; contractId: string }>
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

  return (
    <>
      <SummaryCards
        monthlyTotal={totals.monthly}
        annualTotal={totals.annual}
        contractCount={filteredContracts.length}
        alertCount={cancellationContracts.length}
      />
      <CostInsightsPanel insights={data?.costInsights as Parameters<typeof CostInsightsPanel>[0]["insights"]} />
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
