"use client"

import { useState, useTransition } from "react"
import {
  getInboxPageData,
  uploadInboxDocumentAction,
  archiveInboxItemAction,
  createTaskFromInboxAction,
} from "@/app/actions/inbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Upload, Archive, ListTodo, FileDown, FilePlus2 } from "lucide-react"

type Initial = Awaited<ReturnType<typeof getInboxPageData>>

export function InboxPageClient({ initial }: { initial: Initial }) {
  const [items, setItems] = useState(initial.items)
  const [pending, startTransition] = useTransition()

  async function reload() {
    const data = await getInboxPageData()
    setItems(data.items)
  }

  async function onUpload(formData: FormData) {
    startTransition(async () => {
      try {
        await uploadInboxDocumentAction(formData)
        toast.success("Document analysé et ajouté à l’inbox")
        await reload()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur upload")
      }
    })
  }

  async function onArchive(id: string) {
    startTransition(async () => {
      try {
        await archiveInboxItemAction(id)
        toast.success("Archivé")
        await reload()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur")
      }
    })
  }

  async function onCreateTask(id: string) {
    startTransition(async () => {
      try {
        await createTaskFromInboxAction(id)
        toast.success("Tâche créée")
        await reload()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur")
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <form
        className="rounded-2xl border border-border border-dashed p-6 flex flex-col gap-3 bg-muted/20"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onUpload(fd)
        }}
      >
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Déposer un document administratif (PDF ou image)
        </p>
        <Input name="file" type="file" accept=".pdf,image/*" className="rounded-xl" required />
        <Button type="submit" className="rounded-xl w-fit" disabled={pending}>
          Analyser et ajouter
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Inbox vide — ajoutez un premier document.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.originalFilename}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.classification} · urgence {item.urgency}
                    {item.dueDate ? ` · échéance ${new Date(item.dueDate).toLocaleDateString("fr-CH")}` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl gap-1 h-8 text-xs" asChild>
                  <a href={`/api/inbox/items/${item.id}/download`} target="_blank" rel="noreferrer">
                    <FileDown className="w-3.5 h-3.5" />
                    Télécharger
                  </a>
                </Button>
              </div>
              {item.summary && <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>}
              {item.recommendedAction && (
                <p className="text-xs text-foreground/90">
                  <span className="font-medium">Action suggérée : </span>
                  {item.recommendedAction}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="rounded-xl gap-1 h-8 text-xs"
                  disabled={pending}
                  asChild
                >
                  <a href={`/upload?fromInbox=${encodeURIComponent(item.id)}`}>
                    <FilePlus2 className="w-3.5 h-3.5" />
                    Créer un contrat
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-xl gap-1 h-8 text-xs"
                  disabled={pending || item.derivedTasks.length > 0}
                  onClick={() => onCreateTask(item.id)}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  {item.derivedTasks.length > 0 ? "Tâche créée" : "Créer une tâche"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1 h-8 text-xs"
                  disabled={pending}
                  onClick={() => onArchive(item.id)}
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
