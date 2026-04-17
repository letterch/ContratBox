import { requirePlanModule } from "@/lib/guards/require-access"
import { getTasksPageData } from "@/app/actions/tasks"
import { TasksPageClient } from "@/components/tasks/tasks-page-client"

export default async function TasksPage() {
  await requirePlanModule("module_tasks")
  const initial = await getTasksPageData({
    status: "all",
    priority: "all",
    includeArchived: false,
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Tâches administratives</h1>
        <TasksPageClient initial={initial} />
      </div>
    </div>
  )
}
