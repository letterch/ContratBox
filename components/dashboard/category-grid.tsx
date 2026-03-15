import Link from "next/link"
import { Shield, Wifi, Home, Car, Zap, Tv, ChevronRight, FileText } from "lucide-react"
import { CONTRACT_CATEGORIES } from "@/lib/constants"

const categoryIcons: Record<string, typeof Shield> = {
  household_insurance: Shield,
  car_insurance: Car,
  telecom_internet: Wifi,
  telecom_mobile: Wifi,
  mortgage: Home,
  rent_lease: Home,
  utilities_electricity: Zap,
  utilities_gas: Zap,
  subscriptions: Tv,
  other: FileText,
}
const categoryColors: Record<string, string> = {
  household_insurance: "text-primary bg-primary/8 border-primary/15",
  car_insurance: "text-[oklch(0.70_0.15_60)] bg-[oklch(0.70_0.15_60)]/8 border-[oklch(0.70_0.15_60)]/15",
  telecom_internet: "text-[oklch(0.58_0.18_220)] bg-[oklch(0.58_0.18_220)]/8 border-[oklch(0.58_0.18_220)]/15",
  mortgage: "text-[oklch(0.56_0.15_162)] bg-[oklch(0.56_0.15_162)]/8 border-[oklch(0.56_0.15_162)]/15",
  default: "text-muted-foreground bg-muted/50 border-border",
}

type Contract = {
  category?: string | null
  premiumAmount?: unknown
  premiumFrequency?: string | null
  rawExtraction?: unknown
}

export function CategoryGrid({ contracts = [] }: { contracts?: Contract[] }) {
  const byCategory = contracts.reduce<Record<string, { count: number; amount: number }>>((acc, c) => {
    const cat = c.category ?? "other"
    if (!acc[cat]) acc[cat] = { count: 0, amount: 0 }
    acc[cat].count++
    let n = Number((c.premiumAmount as number) ?? 0)
    if (cat === "rent_lease" && c.rawExtraction && typeof c.rawExtraction === "object") {
      const raw = c.rawExtraction as Record<string, unknown>
      const rent = Number(raw.leaseMonthlyRent ?? 0) || 0
      const charges = Number(raw.leaseMonthlyCharges ?? 0) || 0
      if (rent + charges > 0) n = rent + charges
    }
    acc[cat].amount += c.premiumFrequency === "annual" ? n / 12 : n
    return acc
  }, {})
  const categories = Object.entries(byCategory).map(([slug, { count, amount }]) => ({
    slug,
    label: CONTRACT_CATEGORIES[slug as keyof typeof CONTRACT_CATEGORIES] ?? slug,
    icon: categoryIcons[slug] ?? FileText,
    count,
    amount: `CHF ${Math.round(amount).toLocaleString("fr-CH")}/mois`,
    style: categoryColors[slug] ?? categoryColors.default,
  }))
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground text-sm">Catégories</h2>
        <Link href="/contracts" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          Tout voir
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {categories.length === 0 ? (
          <p className="col-span-2 sm:col-span-3 text-xs text-muted-foreground py-4">Aucune catégorie pour l'instant.</p>
        ) : (
          categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/contracts?category=${cat.slug}`}
              className={`rounded-xl border ${cat.style} p-3.5 hover:shadow-card transition-all group`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <cat.icon className="w-4 h-4" />
                <span className="text-[10px] font-semibold">{cat.count}</span>
              </div>
              <p className="text-xs font-semibold text-foreground mb-0.5">{cat.label}</p>
              <p className="text-[10px] opacity-80">{cat.amount}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
