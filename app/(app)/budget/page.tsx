import { requirePlanModule } from "@/lib/guards/require-access"
import { getBudgetPageDataAction } from "@/app/actions/budget"
import { BudgetPageClient } from "@/components/budget/budget-page-client"

export default async function BudgetPage() {
  await requirePlanModule("module_budget")
  const data = await getBudgetPageDataAction()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Budget</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenus, enveloppes et vision nette du ménage (revenus − primes − factures).
          </p>
        </div>
        <BudgetPageClient
          year={data.year}
          month={data.month}
          cashflow={data.cashflow}
          members={data.members.map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
          }))}
          incomes={data.incomes.map((i) => ({
            id: i.id,
            name: i.name,
            amount: Number(i.amount),
            frequency: i.frequency,
            category: i.category,
            memberLabel: i.member
              ? `${i.member.firstName}${i.member.lastName ? ` ${i.member.lastName}` : ""}`
              : "Famille",
          }))}
          envelopes={data.envelopes.map((e) => ({
            id: e.id,
            name: e.name,
            amount: Number(e.amount),
            category: e.category,
          }))}
        />
      </div>
    </div>
  )
}
