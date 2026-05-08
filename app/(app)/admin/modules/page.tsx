import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PLAN_FEATURE_KEYS, PLANS, PLAN_SLUGS } from "@/lib/config/plans"
import { AdminUserModulesClient } from "@/components/admin/admin-user-modules-client"
import { ShieldCheck } from "lucide-react"

export default async function AdminModulesPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "admin") redirect("/dashboard")

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Modules & quotas par utilisateur
        </h1>
        <p className="text-sm text-muted-foreground">
          Activez manuellement des modules pour des comptes spécifiques (early access) et ajustez le
          quota mensuel de questions IA.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plans en vigueur</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-2 py-2">Plan</th>
                <th className="px-2 py-2">Contrats</th>
                <th className="px-2 py-2">Factures</th>
                <th className="px-2 py-2">Inbox</th>
                <th className="px-2 py-2">Tâches</th>
                <th className="px-2 py-2">Questions IA / mois</th>
                <th className="px-2 py-2">Modules inclus</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_SLUGS.map((slug) => {
                const p = PLANS[slug]
                const fmt = (n: number | null) => (n == null ? "∞" : String(n))
                const enabledModules = (PLAN_FEATURE_KEYS as readonly string[])
                  .filter((k) => p.features[k as keyof typeof p.features])
                  .join(", ")
                return (
                  <tr key={slug} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium">
                      {p.label}
                      <div className="text-xs font-normal text-muted-foreground">{p.description}</div>
                    </td>
                    <td className="px-2 py-2">{fmt(p.quotas.maxContracts)}</td>
                    <td className="px-2 py-2">{fmt(p.quotas.maxBills)}</td>
                    <td className="px-2 py-2">{fmt(p.quotas.maxInboxItems)}</td>
                    <td className="px-2 py-2">{fmt(p.quotas.maxTasks)}</td>
                    <td className="px-2 py-2">{fmt(p.quotas.maxAiQuestionsPerMonth)}</td>
                    <td className="px-2 py-2 text-xs">{enabledModules || "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AdminUserModulesClient
        moduleKeys={PLAN_FEATURE_KEYS as unknown as string[]}
      />
    </div>
  )
}
