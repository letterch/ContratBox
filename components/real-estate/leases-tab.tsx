import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createLeaseUnitAction, updateLeaseUnitAction } from "@/app/actions/real-estate"
import type { PropertyView } from "@/lib/services/real-estate/portfolio"
import { formatChf, isoDate } from "@/components/real-estate/format"
import { DeleteLeaseUnitButton } from "@/components/real-estate/operations-actions"

const inputClass =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"

type Props = {
  rentalProperties: PropertyView[]
  /** Tous les biens (rendement + résidence) — utile pour info, mais le formulaire reste sur les locatifs. */
  allProperties: PropertyView[]
}

export function LeasesTab({ rentalProperties, allProperties }: Props) {
  const allLeases = rentalProperties.flatMap((p) =>
    p.leases.map((l) => ({ ...l, propertyId: p.id, propertyName: p.name, propertyAddress: p.address }))
  )

  const totalRent = allLeases
    .filter((l) => l.isRented)
    .reduce((s, l) => s + l.rentMonthly + l.chargesMonthly, 0)
  const occupiedCount = allLeases.filter((l) => l.isRented).length
  const vacantCount = allLeases.length - occupiedCount

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête + KPIs locations */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiTile label="Lots loués" value={`${occupiedCount}`} sub={`${vacantCount} vacant${vacantCount > 1 ? "s" : ""}`} />
        <KpiTile label="Loyer mensuel total" value={`CHF ${formatChf(totalRent)}`} sub="Loyer + charges" accent="income" />
        <KpiTile label="Loyer annuel" value={`CHF ${formatChf(totalRent * 12)}`} sub="Estimation contractuelle" />
        <KpiTile label="Biens locatifs" value={`${rentalProperties.length}`} sub={`${allProperties.length - rentalProperties.length} domicile(s) principal`} />
      </div>

      {/* Formulaire d'ajout d'un locataire */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <header className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Ajouter un locataire</h3>
        </header>
        {rentalProperties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun bien de rendement disponible. Ajoutez un bien dans l&apos;onglet « Mes biens » et marquez-le comme bien de rendement pour pouvoir y rattacher un locataire.
          </p>
        ) : (
          <form action={createLeaseUnitAction} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <label className="flex flex-col gap-1 md:col-span-2 lg:col-span-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Bien de rendement</span>
              <select name="propertyId" required className={inputClass}>
                <option value="">— Sélectionner —</option>
                {rentalProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.address ? ` · ${p.address}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Lot / appartement</span>
              <input name="label" placeholder="ex: 3.5 pièces 2e étage" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Locataire</span>
              <input name="tenantName" placeholder="ex: M. Dupont" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Loyer net / mois (CHF)</span>
              <input name="rentMonthly" type="number" step="0.01" placeholder="1850" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Charges / mois (CHF)</span>
              <input name="chargesMonthly" type="number" step="0.01" placeholder="250" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Date d&apos;entrée</span>
              <input name="startDate" type="date" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Date de fin (optionnel)</span>
              <input name="endDate" type="date" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Statut</span>
              <select name="isRented" defaultValue="true" className={inputClass}>
                <option value="true">Loué</option>
                <option value="false">Vacant</option>
              </select>
            </label>
            <div className="md:col-span-3 lg:col-span-6 flex justify-end">
              <Button type="submit" size="sm" className="rounded-lg gap-1 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Enregistrer le locataire
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Liste des locations regroupées par bien */}
      {rentalProperties.length > 0 && (
        <div className="flex flex-col gap-3">
          {rentalProperties.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.address ?? "Adresse non renseignée"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Loyer mensuel encaissable</p>
                  <p className="text-sm font-semibold text-emerald-600">CHF {formatChf(p.monthlyRentalIncome)}</p>
                </div>
              </header>
              {p.leases.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucun locataire enregistré pour ce bien.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {p.leases.map((l) => (
                    <li key={l.id} className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <form action={updateLeaseUnitAction} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end">
                        <input type="hidden" name="leaseId" value={l.id} />
                        <label className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                          <span className="text-[9px] uppercase text-muted-foreground">Lot</span>
                          <input name="label" defaultValue={l.label} className={inputClass} />
                        </label>
                        <label className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                          <span className="text-[9px] uppercase text-muted-foreground">Locataire</span>
                          <input name="tenantName" defaultValue={l.tenantName ?? ""} className={inputClass} />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase text-muted-foreground">Loyer CHF</span>
                          <input name="rentMonthly" type="number" step="0.01" defaultValue={l.rentMonthly} className={inputClass} />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase text-muted-foreground">Charges CHF</span>
                          <input name="chargesMonthly" type="number" step="0.01" defaultValue={l.chargesMonthly} className={inputClass} />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase text-muted-foreground">Entrée</span>
                          <input name="startDate" type="date" defaultValue={isoDate(l.startDate)} className={inputClass} />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase text-muted-foreground">Statut</span>
                          <select name="isRented" defaultValue={l.isRented ? "true" : "false"} className={inputClass}>
                            <option value="true">Loué</option>
                            <option value="false">Vacant</option>
                          </select>
                        </label>
                        <div className="flex gap-1 justify-end">
                          <Button type="submit" size="sm" variant="ghost" className="rounded-lg h-7 text-[11px] px-2">
                            Mettre à jour
                          </Button>
                          <DeleteLeaseUnitButton leaseUnitId={l.id} />
                        </div>
                      </form>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Total mensuel : CHF {formatChf(l.monthlyTotal)} ({l.isRented ? "loué" : "vacant"})
                        {l.startDate ? ` · Entrée le ${l.startDate.toLocaleDateString("fr-CH")}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: "income" | "cost"
}) {
  const accentClass =
    accent === "income"
      ? "border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-900/20"
      : accent === "cost"
        ? "border-red-300/40 bg-red-50/40 dark:bg-red-900/20"
        : "border-border bg-card"
  return (
    <div className={`rounded-2xl border ${accentClass} p-4`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground mt-1">{sub}</p> : null}
    </div>
  )
}
