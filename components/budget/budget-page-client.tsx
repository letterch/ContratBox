"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createIncomeAction, deleteIncomeAction, saveEnvelopeAction } from "@/app/actions/budget"
import type { BudgetCashflow } from "@/lib/services/budget-engine"
import { Trash2, Wallet } from "lucide-react"

function chf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n)
}

export function BudgetPageClient({
  year,
  month,
  cashflow,
  members,
  incomes,
  envelopes,
}: {
  year: number
  month: number
  cashflow: BudgetCashflow
  members: Array<{ id: string; firstName: string; lastName: string | null }>
  incomes: Array<{
    id: string
    name: string
    amount: number
    frequency: string
    category: string
    memberLabel: string
  }>
  envelopes: Array<{ id: string; name: string; amount: number; category: string }>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Revenus / mois", value: cashflow.incomeMonthly },
          { label: "Primes / mois", value: cashflow.premiumsMonthly },
          { label: "Factures / mois", value: cashflow.billsMonthly },
          { label: "Net / mois", value: cashflow.netMonthly },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={`text-lg font-semibold mt-1 ${k.label.startsWith("Net") && k.value < 0 ? "text-destructive" : ""}`}>
              {chf(k.value)}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Revenus
        </h2>
        <div className="grid gap-2">
          {incomes.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{i.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {chf(i.amount)} · {i.frequency} · {i.memberLabel}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteIncomeAction(i.id)
                    router.refresh()
                  })
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {incomes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun revenu saisi.</p>
          ) : null}
        </div>

        <form
          className="rounded-2xl border border-dashed border-border p-4 grid gap-3 sm:grid-cols-2"
          action={(fd) => {
            startTransition(async () => {
              setError(null)
              const r = await createIncomeAction(fd)
              if (!r.ok) setError(r.error)
              else router.refresh()
            })
          }}
        >
          <div className="sm:col-span-2 text-xs font-medium text-muted-foreground">Ajouter un revenu</div>
          <div>
            <Label className="text-xs">Libellé</Label>
            <Input name="name" required placeholder="Salaire, allocations…" className="h-9 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Montant CHF</Label>
            <Input name="amount" type="number" step="0.01" required className="h-9 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Fréquence</Label>
            <select name="frequency" defaultValue="monthly" className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="monthly">Mensuel</option>
              <option value="thirteenth_salary">13e salaire</option>
              <option value="yearly">Annuel</option>
              <option value="quarterly">Trimestriel</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Catégorie</Label>
            <select name="category" defaultValue="salary" className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="salary">Salaire</option>
              <option value="bonus">Bonus</option>
              <option value="rental">Loyer perçu</option>
              <option value="pension">Rente</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Membre (optionnel)</Label>
            <select name="memberId" defaultValue="__none__" className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="__none__">Famille entière</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName ?? ""}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending} className="rounded-xl">
              Enregistrer le revenu
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Enveloppes {month}/{year}</h2>
        <div className="grid gap-2">
          {envelopes.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card px-4 py-3 flex justify-between">
              <div>
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">{e.category}</p>
              </div>
              <p className="text-sm font-semibold">{chf(e.amount)}</p>
            </div>
          ))}
        </div>
        <form
          className="rounded-2xl border border-dashed border-border p-4 grid gap-3 sm:grid-cols-2"
          action={(fd) => {
            startTransition(async () => {
              setError(null)
              const r = await saveEnvelopeAction(fd)
              if (!r.ok) setError(r.error)
              else router.refresh()
            })
          }}
        >
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <div className="sm:col-span-2 text-xs font-medium text-muted-foreground">Nouvelle enveloppe</div>
          <div>
            <Label className="text-xs">Nom</Label>
            <Input name="name" required placeholder="Courses, loisirs…" className="h-9 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Montant CHF</Label>
            <Input name="amount" type="number" step="0.01" required className="h-9 rounded-xl" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Catégorie</Label>
            <Input name="category" defaultValue="other" className="h-9 rounded-xl" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending} variant="secondary" className="rounded-xl">
              Enregistrer l&apos;enveloppe
            </Button>
          </div>
        </form>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
