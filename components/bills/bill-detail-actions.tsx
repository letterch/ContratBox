"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Trash2 } from "lucide-react"
import { markBillPaidAction, deleteBillAction } from "@/app/actions/bills"
import { toast } from "sonner"

export function BillDetailActions({ billId, status }: { billId: string; status: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onMarkPaid() {
    start(async () => {
      const res = await markBillPaidAction(billId)
      if (res.ok) {
        toast.success("Facture marquée comme payée")
        router.refresh()
      } else {
        toast.error(res.error || "Erreur")
      }
    })
  }

  function onDelete() {
    if (!confirm("Supprimer cette facture ?")) return
    start(async () => {
      const res = await deleteBillAction(billId)
      if (res.ok) {
        toast.success("Facture supprimée")
        router.push("/bills")
      } else {
        toast.error(res.error || "Erreur")
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "paid" && status !== "cancelled" && (
        <Button onClick={onMarkPaid} disabled={pending} size="sm">
          <Check className="mr-1 h-4 w-4" />
          {pending ? "…" : "Marquer payée"}
        </Button>
      )}
      <Button onClick={onDelete} disabled={pending} size="sm" variant="destructive">
        <Trash2 className="mr-1 h-4 w-4" />
        Supprimer
      </Button>
    </div>
  )
}
