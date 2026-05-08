"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CONTRACT_CATEGORIES, CONTRACT_CATEGORY_SLUGS } from "@/lib/constants"
import { createContractManualAction } from "@/app/actions/contracts"
import type { ContractCategorySlug } from "@/lib/constants"
import { toast } from "sonner"

type Member = { id: string; firstName: string; lastName?: string | null }

export function ManualContractForm({ members }: { members: Member[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [scope, setScope] = useState<"household" | "member">("household")
  const [memberId, setMemberId] = useState<string>("")

  function handleSubmit(formData: FormData) {
    const title = (formData.get("title") as string)?.trim()
    const provider = (formData.get("provider") as string)?.trim()
    const category = (formData.get("category") as string) || "other"
    const premiumStr = (formData.get("premiumAmount") as string) ?? ""
    const premium = premiumStr ? Number.parseFloat(premiumStr.replace(",", ".")) : null
    const renewalDate = (formData.get("renewalDate") as string) || null
    const startDate = (formData.get("startDate") as string) || null
    const cancellationNoticeStr = (formData.get("cancellationNoticeDays") as string) || ""
    const cancellationNoticeDays = cancellationNoticeStr ? Number.parseInt(cancellationNoticeStr, 10) : null
    const policyNumber = (formData.get("policyNumber") as string) || null
    const notes = (formData.get("notes") as string) || null
    const premiumFrequency = (formData.get("premiumFrequency") as string) || "monthly"

    if (!title) {
      toast.error("Titre requis")
      return
    }

    start(async () => {
      const res = await createContractManualAction({
        title,
        provider: provider || null,
        category: (CONTRACT_CATEGORY_SLUGS as readonly string[]).includes(category)
          ? (category as ContractCategorySlug)
          : null,
        policyNumber,
        memberId: scope === "member" ? memberId || null : null,
        isHouseholdWide: scope === "household",
        premiumAmount: Number.isFinite(premium) ? (premium as number) : null,
        premiumFrequency,
        startDate,
        renewalDate,
        cancellationNoticeDays,
        notes,
      })
      if (res.ok) {
        toast.success("Contrat enregistré")
        router.push(`/contracts/${res.contractId}`)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <form
      action={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <Label htmlFor="title" className="mb-1.5 block text-sm">
          Titre du contrat *
        </Label>
        <Input id="title" name="title" placeholder="Ex: Assurance ménage Helvetia" required />
      </div>
      <div>
        <Label htmlFor="provider" className="mb-1.5 block text-sm">
          Prestataire
        </Label>
        <Input id="provider" name="provider" placeholder="Ex: Swisscom, AXA…" />
      </div>
      <div>
        <Label className="mb-1.5 block text-sm">Catégorie</Label>
        <Select name="category" defaultValue="other">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONTRACT_CATEGORIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1.5 block text-sm">Attribution</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as "household" | "member")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="household">Ménage entier</SelectItem>
            <SelectItem value="member">Membre spécifique</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {scope === "member" && (
        <div>
          <Label className="mb-1.5 block text-sm">Membre</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un membre" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.firstName}
                  {m.lastName ? ` ${m.lastName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label htmlFor="premiumAmount" className="mb-1.5 block text-sm">
          Prime / mensualité (CHF)
        </Label>
        <Input id="premiumAmount" name="premiumAmount" type="number" step="0.05" placeholder="89.00" />
      </div>
      <div>
        <Label className="mb-1.5 block text-sm">Fréquence</Label>
        <Select name="premiumFrequency" defaultValue="monthly">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Mensuelle</SelectItem>
            <SelectItem value="quarterly">Trimestrielle</SelectItem>
            <SelectItem value="annual">Annuelle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="startDate" className="mb-1.5 block text-sm">
          Date de début
        </Label>
        <Input id="startDate" name="startDate" type="date" />
      </div>
      <div>
        <Label htmlFor="renewalDate" className="mb-1.5 block text-sm">
          Date d'échéance / renouvellement
        </Label>
        <Input id="renewalDate" name="renewalDate" type="date" />
      </div>
      <div>
        <Label htmlFor="cancellationNoticeDays" className="mb-1.5 block text-sm">
          Préavis (jours)
        </Label>
        <Input
          id="cancellationNoticeDays"
          name="cancellationNoticeDays"
          type="number"
          min={0}
          placeholder="90"
        />
      </div>
      <div>
        <Label htmlFor="policyNumber" className="mb-1.5 block text-sm">
          N° de police / contrat
        </Label>
        <Input id="policyNumber" name="policyNumber" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes" className="mb-1.5 block text-sm">
          Notes
        </Label>
        <Input id="notes" name="notes" placeholder="Clauses importantes, particularités…" />
      </div>
      <Button type="submit" disabled={pending} className="h-11 rounded-xl sm:col-span-2">
        {pending ? "Enregistrement…" : "Enregistrer le contrat"}
      </Button>
    </form>
  )
}
