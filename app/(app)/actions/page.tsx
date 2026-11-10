import { requirePlanModule } from "@/lib/guards/require-access"
import { getActionsPageDataAction } from "@/app/actions/actions-module"
import { ActionsPageClient } from "@/components/actions/actions-page-client"

export default async function ActionsPage() {
  await requirePlanModule("module_actions")
  const data = await getActionsPageDataAction()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Actions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lettres de résiliation et contestations — copiez-collez dans NextLetter pour envoi postal.
          </p>
        </div>
        <ActionsPageClient
          suggestions={data.suggestions}
          contracts={data.contracts.map((c) => ({
            id: c.id,
            title: c.title,
            provider: c.provider,
            cancellationDeadline: c.cancellationDeadline?.toISOString().slice(0, 10) ?? null,
          }))}
          bills={data.bills.map((b) => ({
            id: b.id,
            title: b.title,
            provider: b.provider,
            amount: Number(b.amount),
            status: b.status,
          }))}
          logs={data.logs.map((l) => ({
            id: l.id,
            actionType: l.actionType,
            status: l.status,
            letterBody: l.letterBody,
            createdAt: l.createdAt.toISOString(),
            contractLabel: l.contract?.provider ?? l.contract?.title ?? null,
            billLabel: l.bill?.title ?? null,
            nextLetterUrl:
              l.payload && typeof l.payload === "object" && "nextLetterUrl" in (l.payload as object)
                ? String((l.payload as { nextLetterUrl?: string }).nextLetterUrl ?? "")
                : "",
          }))}
        />
      </div>
    </div>
  )
}
