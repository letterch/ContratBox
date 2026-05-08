"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteMortgageLoanAction } from "@/app/actions/real-estate"

export function DeleteMortgageLoanButton({ loanId, label }: { loanId: string; label?: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="rounded-lg h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Supprimer ce prêt${label ? ` « ${label} »` : ""} et toutes ses tranches ? Cette action est irréversible.`
          )
        )
          return
        startTransition(async () => {
          await deleteMortgageLoanAction(loanId)
          router.refresh()
        })
      }}
    >
      <Trash2 className="w-3 h-3 mr-1" />
      Supprimer ce prêt
    </Button>
  )
}
