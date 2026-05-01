"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  deleteLeaseUnitAction,
  deletePropertyChargeAction,
  deleteRentPaymentAction,
  resetPropertyOperationsAction,
} from "@/app/actions/real-estate"

export function ResetPropertyOperationsButton({ propertyId }: { propertyId: string }) {
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
          "Réinitialiser loyers, charges PPE/immeuble et encaissements pour ce bien ? Les prêts (financement) et les décomptes déjà créés ne sont pas supprimés. Irréversible."
        )
        if (!ok) return
        startTransition(async () => {
          await resetPropertyOperationsAction(propertyId)
          router.refresh()
        })
      }}
    >
      {pending ? "Réinitialisation…" : "Réinitialiser loyers & charges"}
    </Button>
  )
}

export function DeletePropertyChargeButton({ chargeId }: { chargeId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="rounded-xl h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer cette charge récurrente ?")) return
        startTransition(async () => {
          await deletePropertyChargeAction(chargeId)
          router.refresh()
        })
      }}
    >
      {pending ? "…" : "Supprimer"}
    </Button>
  )
}

export function DeleteLeaseUnitButton({ leaseUnitId }: { leaseUnitId: string }) {
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
        if (!window.confirm("Supprimer ce lot et tout son historique d’encaissements ?")) return
        startTransition(async () => {
          await deleteLeaseUnitAction(leaseUnitId)
          router.refresh()
        })
      }}
    >
      {pending ? "…" : "Supprimer le lot"}
    </Button>
  )
}

export function DeleteRentPaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="rounded-lg h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer cet encaissement ?")) return
        startTransition(async () => {
          await deleteRentPaymentAction(paymentId)
          router.refresh()
        })
      }}
    >
      ×
    </Button>
  )
}
