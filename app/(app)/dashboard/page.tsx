import Link from "next/link"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { AlertPanel } from "@/components/dashboard/alert-panel"
import { FamilyTabs } from "@/components/dashboard/family-tabs"
import { CategoryGrid } from "@/components/dashboard/category-grid"
import { RecentContracts } from "@/components/dashboard/recent-contracts"
import { QuickAddButton } from "@/components/dashboard/quick-add-button"
import { getDashboardData } from "@/app/actions/dashboard"
import { Bell, ChevronDown } from "lucide-react"

export default async function DashboardPage() {
  const data = await getDashboardData()
  const greeting = "Voici votre résumé"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-bold text-foreground">Tableau de bord</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-xs text-muted-foreground">
                {data?.household?.name ?? "Mon ménage"}
                <ChevronDown className="w-3 h-3" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{greeting}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl bg-muted hover:bg-accent transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[oklch(0.70_0.15_60)]" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 pb-32 lg:pb-8">
        <SummaryCards
          monthlyTotal={data?.totals?.monthly}
          annualTotal={data?.totals?.annual}
          contractCount={data?.household?.contractCount ?? 0}
          alertCount={data?.contractsInCancellationWindow?.length ?? 0}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <FamilyTabs members={data?.household?.members} contracts={data?.contracts} />
            <CategoryGrid contracts={data?.contracts} />
          </div>
          <AlertPanel
            cancellationContracts={data?.contractsInCancellationWindow}
            renewalContracts={data?.contractsNearingRenewal}
          />
        </div>
        <RecentContracts contracts={data?.recentContracts} />
      </div>

      <QuickAddButton />
    </div>
  )
}
