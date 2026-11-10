"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteAllContractsAction } from "@/app/actions/contracts"
import { toast } from "sonner"

export function DashboardReset({ contractCount }: { contractCount: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [wipeHistory, setWipeHistory] = useState(false)

  if (contractCount === 0) return null

  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Repartir à zéro</p>
        <p className="text-xs text-muted-foreground">
          Supprime les {contractCount} contrat{contractCount > 1 ? "s" : ""} actifs pour un dashboard propre.
          L’historique des primes peut être conservé pour les courbes d’évolution.
        </p>
      </div>
      {!open ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Tout supprimer
        </Button>
      ) : (
        <div className="flex flex-col gap-2 shrink-0">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={wipeHistory}
              onChange={(e) => setWipeHistory(e.target.checked)}
            />
            Effacer aussi l’historique des primes
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-xl gap-2"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const r = await deleteAllContractsAction({ wipePremiumHistory: wipeHistory })
                  toast.success(`${r.deleted} contrat(s) supprimé(s)`)
                  setOpen(false)
                  router.refresh()
                })
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {pending ? "Suppression…" : "Confirmer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
