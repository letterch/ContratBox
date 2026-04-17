import { requirePlanModule } from "@/lib/guards/require-access"

export default async function TasksPage() {
  await requirePlanModule("module_tasks")

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Tâches</h1>
        <p className="text-sm text-muted-foreground">
          Module en cours de construction. Les tâches seront liées au foyer, aux contrats et aux documents
          administratifs.
        </p>
      </div>
    </div>
  )
}
