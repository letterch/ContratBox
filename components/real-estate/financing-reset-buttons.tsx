"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteAllMortgageTranchesAction, resetPropertyFinancingAction } from "@/app/actions/real-estate"

export function DeleteAllTranchesButton({ loanId }: { loanId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-xl h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm(
          "Supprimer toutes les tranches de ce prêt ? Les montants par défaut du prêt (capital et taux) restent utilisés pour le calcul si aucune tranche n’est saisie."
        )
        if (!ok) return
        startTransition(async () => {
          await deleteAllMortgageTranchesAction(loanId)
          router.refresh()
        })
      }}
    >
      {pending ? "…" : "Effacer toutes les tranches"}
    </Button>
  )
}

export function ResetPropertyFinancingButton({ propertyId }: { propertyId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      className="rounded-xl h-8 text-xs"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm(
          "Réinitialiser tout le financement de ce bien ? Tous les prêts et tranches seront supprimés. Irréversible."
        )
        if (!ok) return
        startTransition(async () => {
          await resetPropertyFinancingAction(propertyId)
          router.refresh()
        })
      }}
    >
      {pending ? "Réinitialisation…" : "Tout réinitialiser (prêts)"}
    </Button>
  )
}
