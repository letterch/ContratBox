"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createDependentAction, createMemberAction, deactivateDependentAction } from "@/app/actions/family"
import { PawPrint, UserPlus, Users } from "lucide-react"

type Member = {
  id: string
  firstName: string
  lastName: string | null
  role: string
  dateOfBirth: string | null
}

type Dependent = {
  id: string
  type: string
  name: string
  species: string | null
  birthDate: string | null
}

export function FamilyPageClient({
  householdName,
  members,
  dependents,
}: {
  householdName: string
  members: Member[]
  dependents: Dependent[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Ménage : <span className="font-medium text-foreground">{householdName}</span>
      </p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Membres
        </h2>
        <div className="grid gap-2">
          {members.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {m.firstName} {m.lastName ?? ""}
                </p>
                <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
              </div>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun membre pour le moment.</p>
          ) : null}
        </div>

        <form
          className="rounded-2xl border border-dashed border-border p-4 grid gap-3 sm:grid-cols-2"
          action={(fd) => {
            startTransition(async () => {
              setError(null)
              const r = await createMemberAction(fd)
              if (!r.ok) setError(r.error)
              else router.refresh()
            })
          }}
        >
          <div className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserPlus className="w-3.5 h-3.5" />
            Ajouter un membre
          </div>
          <div>
            <Label className="text-xs">Prénom</Label>
            <Input name="firstName" required className="h-9 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Nom</Label>
            <Input name="lastName" className="h-9 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Rôle</Label>
            <select name="role" defaultValue="adult" className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="adult">Adulte</option>
              <option value="child">Enfant</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Date de naissance</Label>
            <Input name="dateOfBirth" type="date" className="h-9 rounded-xl" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending} className="rounded-xl">
              Ajouter
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <PawPrint className="w-4 h-4 text-primary" />
          Enfants & animaux (dépendants)
        </h2>
        <div className="grid gap-2">
          {dependents.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {d.type === "pet" ? `Animal${d.species ? ` · ${d.species}` : ""}` : "Enfant"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deactivateDependentAction(d.id)
                    router.refresh()
                  })
                }
              >
                Retirer
              </Button>
            </div>
          ))}
        </div>

        <form
          className="rounded-2xl border border-dashed border-border p-4 grid gap-3 sm:grid-cols-2"
          action={(fd) => {
            startTransition(async () => {
              setError(null)
              const r = await createDependentAction(fd)
              if (!r.ok) setError(r.error)
              else router.refresh()
            })
          }}
        >
          <div className="sm:col-span-2 text-xs font-medium text-muted-foreground">Ajouter un dépendant</div>
          <div>
            <Label className="text-xs">Nom</Label>
            <Input name="name" required className="h-9 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <select name="type" defaultValue="child" className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="child">Enfant</option>
              <option value="pet">Animal</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Espèce (si animal)</Label>
            <Input name="species" placeholder="Chien, chat…" className="h-9 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Date de naissance</Label>
            <Input name="birthDate" type="date" className="h-9 rounded-xl" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending} className="rounded-xl">
              Ajouter
            </Button>
          </div>
        </form>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
