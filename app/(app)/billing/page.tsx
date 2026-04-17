import { Suspense } from "react"
import { requireAccessContext } from "@/lib/guards/require-access"
import { getBillingPageData } from "@/app/actions/billing"
import { BillingPageClient } from "@/components/billing/billing-page-client"
import { redirect } from "next/navigation"

export default async function BillingPage() {
  await requireAccessContext()
  const data = await getBillingPageData()
  if (!data) redirect("/login")

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Facturation & offre</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
          <BillingPageClient data={data} />
        </Suspense>
      </div>
    </div>
  )
}
