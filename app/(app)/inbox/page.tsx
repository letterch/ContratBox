import { requirePlanModule } from "@/lib/guards/require-access"
import { getInboxPageData } from "@/app/actions/inbox"
import { InboxPageClient } from "@/components/inbox/inbox-page-client"

export default async function InboxPage() {
  await requirePlanModule("module_inbox")
  const initial = await getInboxPageData()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Inbox administrative</h1>
        <InboxPageClient initial={initial} />
      </div>
    </div>
  )
}
