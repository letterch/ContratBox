"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteContractById } from "@/app/actions/contracts"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function DeleteContractButton({
  contractId,
  redirectTo = "/contracts",
  compact = false,
  className,
}: {
  contractId: string
  /** Si null, reste sur la page et refresh seulement. */
  redirectTo?: string | null
  compact?: boolean
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size={compact ? "icon" : "sm"}
      title="Supprimer ce contrat"
      className={cn(
        "rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10",
        compact ? "h-8 w-8" : "gap-2 text-xs",
        className
      )}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const ok = window.confirm("Supprimer ce contrat ? Cette action est irréversible.")
        if (!ok) return
        startTransition(async () => {
          await deleteContractById(contractId)
          toast.success("Contrat supprimé")
          if (redirectTo) router.push(redirectTo)
          router.refresh()
        })
      }}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {compact ? null : pending ? "Suppression..." : "Supprimer"}
    </Button>
  )
}
