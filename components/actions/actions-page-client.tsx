"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  draftCancellationForContractAction,
  draftDisputeForBillAction,
  markActionCopiedAction,
  markActionOpenedNextLetterAction,
} from "@/app/actions/actions-module"
import { Copy, ExternalLink, FileText, Zap } from "lucide-react"
import { toast } from "sonner"

export function ActionsPageClient({
  suggestions,
  contracts,
  bills,
  logs,
}: {
  suggestions: Array<{ contractId: string; label: string; urgency: string }>
  contracts: Array<{
    id: string
    title: string | null
    provider: string | null
    cancellationDeadline: string | null
  }>
  bills: Array<{
    id: string
    title: string
    provider: string | null
    amount: number
    status: string
  }>
  logs: Array<{
    id: string
    actionType: string
    status: string
    letterBody: string | null
    createdAt: string
    contractLabel: string | null
    billLabel: string | null
    nextLetterUrl: string
  }>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [activeLetter, setActiveLetter] = useState<{
    id: string
    body: string
    url: string
  } | null>(null)

  const draftCancel = (contractId: string) => {
    startTransition(async () => {
      const r = await draftCancellationForContractAction(contractId)
      if (r.ok) {
        setActiveLetter({ id: r.actionId, body: r.letterBody, url: r.nextLetterUrl })
        toast.success("Lettre de résiliation prête")
        router.refresh()
      }
    })
  }

  const draftDispute = (billId: string) => {
    startTransition(async () => {
      const r = await draftDisputeForBillAction(billId)
      if (r.ok) {
        setActiveLetter({ id: r.actionId, body: r.letterBody, url: r.nextLetterUrl })
        toast.success("Lettre de contestation prête")
        router.refresh()
      }
    })
  }

  const copyLetter = async () => {
    if (!activeLetter) return
    await navigator.clipboard.writeText(activeLetter.body)
    await markActionCopiedAction(activeLetter.id)
    toast.success("Lettre copiée — collez-la dans NextLetter")
  }

  const openNextLetter = async () => {
    if (!activeLetter?.url) return
    await markActionOpenedNextLetterAction(activeLetter.id)
    window.open(activeLetter.url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        Les lettres sont générées en brouillon. Copiez le texte puis ouvrez NextLetter pour l&apos;envoi postal en Suisse.
      </div>

      {suggestions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Suggestions (délais de résiliation)
          </h2>
          <div className="grid gap-2">
            {suggestions.map((s) => (
              <div
                key={s.contractId}
                className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">Urgence : {s.urgency}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  disabled={pending}
                  onClick={() => draftCancel(s.contractId)}
                >
                  Rédiger
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Contrats actifs</h2>
        <div className="grid gap-2">
          {contracts.slice(0, 12).map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{c.provider ?? c.title ?? "Contrat"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.cancellationDeadline ? `Délai résiliation : ${c.cancellationDeadline}` : "Pas de délai saisi"}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={pending} onClick={() => draftCancel(c.id)}>
                Résiliation
              </Button>
            </div>
          ))}
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun contrat actif.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Factures à traiter</h2>
        <div className="grid gap-2">
          {bills.slice(0, 8).map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {b.provider ?? "—"} · CHF {b.amount.toFixed(2)} · {b.status}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={pending} onClick={() => draftDispute(b.id)}>
                Contester
              </Button>
            </div>
          ))}
          {bills.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucune facture en attente.</p>
          ) : null}
        </div>
      </section>

      {activeLetter ? (
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Lettre générée
          </h2>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/40 rounded-xl p-4 max-h-80 overflow-y-auto">
            {activeLetter.body}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-xl gap-2" onClick={copyLetter}>
              <Copy className="w-3.5 h-3.5" />
              Copier
            </Button>
            {activeLetter.url ? (
              <Button type="button" variant="secondary" className="rounded-xl gap-2" onClick={openNextLetter}>
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir NextLetter
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Historique des brouillons</h2>
        <div className="grid gap-2">
          {logs.map((l) => (
            <button
              key={l.id}
              type="button"
              className="text-left rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
              onClick={() =>
                setActiveLetter({
                  id: l.id,
                  body: l.letterBody ?? "",
                  url: l.nextLetterUrl,
                })
              }
            >
              <p className="text-sm font-medium">
                {l.contractLabel ?? l.billLabel ?? l.actionType}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {l.actionType} · {l.status} · {new Date(l.createdAt).toLocaleString("fr-CH")}
              </p>
            </button>
          ))}
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun brouillon pour le moment.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
