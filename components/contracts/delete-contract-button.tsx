"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteContractById } from "@/app/actions/contracts"

export function DeleteContractButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl gap-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm("Supprimer ce contrat ? Cette action est irréversible.")
        if (!ok) return
        startTransition(async () => {
          await deleteContractById(contractId)
          router.push("/contracts")
          router.refresh()
        })
      }}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {pending ? "Suppression..." : "Supprimer"}
    </Button>
  )
}
