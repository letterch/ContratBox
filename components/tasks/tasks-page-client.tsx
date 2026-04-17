"use client"

import { useEffect, useState, useTransition } from "react"
import {
  getTasksPageData,
  createTaskAction,
  updateTaskStatusAction,
  archiveTaskAction,
} from "@/app/actions/tasks"
import type { HouseholdTaskPriority, HouseholdTaskStatus } from "@/lib/types/household-task"
import { HOUSEHOLD_TASK_PRIORITIES, HOUSEHOLD_TASK_STATUSES } from "@/lib/types/household-task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Archive } from "lucide-react"

type InitialData = Awaited<ReturnType<typeof getTasksPageData>>

export function TasksPageClient({ initial }: { initial: InitialData }) {
  const [data, setData] = useState(initial)
  const [status, setStatus] = useState<HouseholdTaskStatus | "all">("all")
  const [priority, setPriority] = useState<HouseholdTaskPriority | "all">("all")
  const [includeArchived, setIncludeArchived] = useState(false)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [newPriority, setNewPriority] = useState<HouseholdTaskPriority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [contractId, setContractId] = useState<string>("none")
  const [memberId, setMemberId] = useState<string>("none")

  async function refresh() {
    const next = await getTasksPageData({ status, priority, includeArchived })
    setData(next)
  }

  useEffect(() => {
    let cancelled = false
    void getTasksPageData({ status, priority, includeArchived }).then((next) => {
      if (!cancelled) setData(next)
    })
    return () => {
      cancelled = true
    }
  }, [status, priority, includeArchived])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Titre requis")
      return
    }
    startTransition(async () => {
      try {
        await createTaskAction({
          title: title.trim(),
          description: description.trim() || null,
          priority: newPriority,
          dueDate: dueDate || null,
          contractId: contractId === "none" ? null : contractId,
          assignedToMemberId: memberId === "none" ? null : memberId,
        })
        toast.success("Tâche créée")
        setOpen(false)
        setTitle("")
        setDescription("")
        setDueDate("")
        setContractId("none")
        setMemberId("none")
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  async function onStatusChange(taskId: string, s: HouseholdTaskStatus) {
    startTransition(async () => {
      try {
        await updateTaskStatusAction(taskId, s)
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  async function onArchive(taskId: string) {
    startTransition(async () => {
      try {
        await archiveTaskAction(taskId)
        toast.success("Tâche archivée")
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Statut</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as HouseholdTaskStatus | "all")}
          >
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous (sauf archivés)</SelectItem>
              {HOUSEHOLD_TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Priorité</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as HouseholdTaskPriority | "all")}
          >
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {HOUSEHOLD_TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Inclure archivés
        </label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl ml-auto gap-1">
              <Plus className="w-4 h-4" />
              Nouvelle tâche
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une tâche</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Priorité</Label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as HouseholdTaskPriority)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUSEHOLD_TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Échéance</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div>
                <Label>Contrat lié</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {data.contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title || c.provider || c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigner à</Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {data.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="rounded-xl" disabled={pending}>
                Enregistrer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {data.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-2xl">
          Aucune tâche pour ces filtres. Créez-en une ou modifiez les filtres.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.tasks.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{t.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t.priority} · {t.status}
                  {t.dueDate ? ` · échéance ${new Date(t.dueDate).toLocaleDateString("fr-CH")}` : ""}
                  {t.contract ? ` · ${t.contract.provider ?? t.contract.title ?? "Contrat"}` : ""}
                  {t.assignedTo ? ` · ${t.assignedTo.firstName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={t.status} onValueChange={(v) => onStatusChange(t.id, v as HouseholdTaskStatus)}>
                  <SelectTrigger className="w-[140px] rounded-xl h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUSEHOLD_TASK_STATUSES.filter((s) => s !== "archived").map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1"
                  onClick={() => onArchive(t.id)}
                  disabled={pending || t.status === "archived"}
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archiver
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
