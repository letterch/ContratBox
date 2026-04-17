import { requirePlanModule } from "@/lib/guards/require-access"

export default async function InboxPage() {
  await requirePlanModule("module_inbox")

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Inbox administrative</h1>
        <p className="text-sm text-muted-foreground">
          Module en cours de construction. Vous pourrez y déposer des documents hors contrats, les classifier et
          générer des actions.
        </p>
      </div>
    </div>
  )
}
