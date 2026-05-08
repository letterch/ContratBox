"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BILL_CATEGORIES,
  BILL_RECURRENCES,
  BILL_RECURRENCE_LABELS,
  BILL_STATUSES,
  BILL_STATUS_LABELS,
} from "@/lib/constants"
import { createBillAction } from "@/app/actions/bills"
import { toast } from "sonner"

type Member = { id: string; firstName: string; lastName: string | null }
type Contract = { id: string; title: string | null; provider: string | null }

export function BillManualForm({
  members,
  contracts,
}: {
  members: Member[]
  contracts: Contract[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [scope, setScope] = useState<"household" | "member">("household")

  function handleSubmit(formData: FormData) {
    if (scope === "household") {
      formData.set("isHouseholdWide", "on")
      formData.delete("memberId")
    } else {
      formData.set("isHouseholdWide", "off")
    }
    start(async () => {
      const res = await createBillAction(formData)
      if (res.ok) {
        toast.success("Facture enregistrée")
        router.refresh()
        router.push(`/bills/${res.billId}`)
      } else {
        toast.error(res.error || "Erreur")
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="title">Titre *</Label>
        <Input id="title" name="title" required placeholder="ex. Facture Swisscom mars 2026" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="provider">Émetteur</Label>
          <Input id="provider" name="provider" placeholder="ex. Swisscom" />
        </div>
        <div>
          <Label htmlFor="amount">Montant (CHF) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.05"
            inputMode="decimal"
            required
            placeholder="89.90"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Catégorie</Label>
          <Select name="category" defaultValue="other">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BILL_CATEGORIES).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Récurrence</Label>
          <Select name="recurrence" defaultValue="monthly">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILL_RECURRENCES.map((r) => (
                <SelectItem key={r} value={r}>
                  {BILL_RECURRENCE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="issueDate">Date facture</Label>
          <Input id="issueDate" name="issueDate" type="date" />
        </div>
        <div>
          <Label htmlFor="dueDate">Échéance</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Statut</Label>
          <Select name="status" defaultValue="pending">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {BILL_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="invoiceNumber">N° facture</Label>
          <Input id="invoiceNumber" name="invoiceNumber" />
        </div>
      </div>

      <div>
        <Label>Attribution</Label>
        <div className="flex flex-col gap-2 md:flex-row">
          <Select value={scope} onValueChange={(v) => setScope(v as "household" | "member")}>
            <SelectTrigger className="md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="household">Ménage entier</SelectItem>
              <SelectItem value="member">Membre spécifique</SelectItem>
            </SelectContent>
          </Select>
          {scope === "member" && (
            <Select name="memberId">
              <SelectTrigger className="flex-1">
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
          )}
        </div>
      </div>

      {contracts.length > 0 && (
        <div>
          <Label>Lier à un contrat (optionnel)</Label>
          <Select name="contractId">
            <SelectTrigger>
              <SelectValue placeholder="Aucun contrat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucun</SelectItem>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title || c.provider || c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enregistrement…" : "Enregistrer la facture"}
      </Button>
    </form>
  )
}
