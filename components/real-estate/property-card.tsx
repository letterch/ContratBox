import Link from "next/link"
import { Plus, Trash2, FileText, ArrowRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  addMortgageTrancheAction,
  addPropertyChargeAction,
  archiveRealEstatePropertyAction,
  createMortgageLoanAction,
  deleteMortgageTrancheAction,
  setPrimaryMortgageDebtAction,
  updateMortgageTrancheAction,
  updatePropertyAmortizationAction,
  updateRealEstatePropertyAction,
} from "@/app/actions/real-estate"
import type { PropertyMortgageView, PropertyView } from "@/lib/services/real-estate/portfolio"
import { DeletePropertyChargeButton } from "@/components/real-estate/operations-actions"
import { DeleteMortgageLoanButton } from "@/components/real-estate/loan-actions"
import { formatChf, formatPct, isoDate } from "@/components/real-estate/format"

const inputClass =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"
const sectionClass = "rounded-xl border border-border/70 bg-muted/30 p-3"

const CHARGE_TYPE_LABEL: Record<string, string> = {
  ppe: "PPE",
  maintenance: "Entretien",
  insurance: "Assurance",
  utilities: "Énergie/Eau",
  tax: "Taxe",
  other: "Autre",
}

const FREQ_LABEL: Record<string, string> = {
  monthly: "/ mois",
  quarterly: "/ trim.",
  annual: "/ an",
}

export function PropertyCard({ property }: { property: PropertyView }) {
  const mortgageLoansList = property.mortgageLoans.filter((l) => l.loanKind === "mortgage")
  const legacyAmortizationLoans = property.mortgageLoans.filter((l) => l.loanKind === "amortization")
  const usageBadge = property.isPrimaryResidence ? "Domicile principal" : "Bien de rendement"

  return (
    <article className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* En-tête : titre + bouton ouvrir + supprimer */}
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{property.name}</h3>
            <span
              className={`text-[10px] rounded-full border px-2 py-0.5 ${
                property.isPrimaryResidence
                  ? "border-amber-300/60 bg-amber-100/50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                  : "border-emerald-300/60 bg-emerald-100/50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
              }`}
            >
              {usageBadge}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{property.address ?? "Adresse non renseignée"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-lg gap-1 h-8 text-xs">
            <Link href={`/real-estate/${property.id}/statement`}>
              <FileText className="w-3.5 h-3.5" />
              Décompte
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg gap-1 h-8 text-xs">
            <Link href={`/real-estate/${property.id}/financing`}>
              Détails
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <form action={archiveRealEstatePropertyAction}>
            <input type="hidden" name="propertyId" value={property.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="rounded-lg h-8 text-xs text-destructive hover:bg-destructive/10"
              title="Archiver ce bien"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </header>

      {/* Bloc 1 : Informations du bien */}
      <section className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={sectionClass}>
          <h4 className="text-xs font-semibold text-foreground mb-2">Informations du bien</h4>
          <form action={updateRealEstatePropertyAction} className="grid grid-cols-2 gap-2">
            <input type="hidden" name="propertyId" value={property.id} />
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Nom</span>
              <input name="name" defaultValue={property.name} className={inputClass} />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Adresse</span>
              <input
                name="address"
                defaultValue={property.address ?? ""}
                placeholder="Rue, NPA, ville"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Usage</span>
              <select name="investmentKind" defaultValue={property.investmentKind} className={inputClass}>
                <option value="rental">Bien de rendement</option>
                <option value="primary_residence">Domicile principal</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</span>
              <select name="propertyType" defaultValue={property.propertyType} className={inputClass}>
                <option value="apartment">Appartement</option>
                <option value="house">Maison</option>
                <option value="mixed">Immeuble mixte</option>
                <option value="commercial">Commercial</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Valeur d&apos;achat (CHF)</span>
              <input
                name="purchaseValueChf"
                type="number"
                step="1"
                min="0"
                defaultValue={property.purchaseValueChf ?? ""}
                placeholder="ex: 850000"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Date d&apos;achat</span>
              <input
                name="purchaseDate"
                type="date"
                defaultValue={isoDate(property.purchaseDate)}
                className={inputClass}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Valeur actuelle (CHF)</span>
              <input
                name="valuationChf"
                type="number"
                step="1"
                min="0"
                defaultValue={property.valuationChf ?? ""}
                placeholder="ex: 920000"
                className={inputClass}
              />
            </label>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" size="sm" variant="outline" className="rounded-lg h-8 text-xs">
                Enregistrer
              </Button>
            </div>
          </form>
          {property.capitalGainChf != null && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Plus-value latente :{" "}
              <span
                className={
                  property.capitalGainChf >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"
                }
              >
                CHF {formatChf(property.capitalGainChf, { sign: true })} ({formatPct(property.capitalGainPct)})
              </span>
            </p>
          )}
        </div>

        {/* Récapitulatif financier */}
        <div className="grid grid-cols-2 gap-2 content-start">
          <SummaryTile label="Mensuel banque" value={`CHF ${formatChf(property.finance.monthlyMortgageCost)}`} sub="Intérêts + amort." accent="primary" />
          <SummaryTile label="Mensuel total" value={`CHF ${formatChf(property.finance.monthlyTotalCost)}`} sub="+ charges PPE" accent="primary" />
          <SummaryTile label="Intérêts / mois" value={`CHF ${formatChf(property.finance.monthlyInterest)}`} sub={`Taux moyen ${formatPct(property.finance.weightedRatePct)}`} />
          <SummaryTile
            label="Amort. / mois"
            value={`CHF ${formatChf(property.finance.monthlyAmortization)}`}
            sub={`${formatPct(property.finance.amortizationRatePct)} ${property.finance.amortizationMode === "indirect" ? "indirect" : "direct"}`}
          />
          <SummaryTile label="Charges PPE / mois" value={`CHF ${formatChf(property.finance.monthlyExtraCharges)}`} sub={`${property.charges.length} ligne${property.charges.length > 1 ? "s" : ""}`} />
          <SummaryTile
            label={property.isPrimaryResidence ? "Bien d'usage" : "Loyers / mois"}
            value={property.isPrimaryResidence ? "—" : `CHF ${formatChf(property.monthlyRentalIncome)}`}
            sub={property.isPrimaryResidence ? "Pas de loyer" : `${property.leases.filter((l) => l.isRented).length} loué`}
            accent={property.isPrimaryResidence ? undefined : "income"}
          />
        </div>
      </section>

      {/* Bloc 2 : Dette hypothécaire — un sous-bloc par prêt */}
      <section className="px-5 py-4 border-t border-border/60">
        <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-semibold text-foreground">Dette hypothécaire</h4>
          <p className="text-[11px] text-muted-foreground">
            {mortgageLoansList.length === 0
              ? "Aucune dette saisie"
              : `${mortgageLoansList.length} prêt${mortgageLoansList.length > 1 ? "s" : ""} · Capital total CHF ${formatChf(
                  mortgageLoansList.reduce((s, l) => s + l.totalDebt, 0)
                )} · Taux moyen ${formatPct(property.finance.weightedRatePct)}`}
          </p>
        </header>

        {/* Aucun prêt : formulaire de saisie rapide */}
        {mortgageLoansList.length === 0 && (
          <form action={setPrimaryMortgageDebtAction} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <input type="hidden" name="propertyId" value={property.id} />
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Dette totale (CHF)</span>
              <input
                name="principalTotal"
                type="number"
                step="0.01"
                min="0"
                placeholder="ex: 600000"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Taux d&apos;intérêt moyen (%)</span>
              <input
                name="ratePct"
                type="number"
                step="0.0001"
                min="0"
                placeholder="ex: 1.85"
                className={inputClass}
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" size="sm" className="rounded-lg h-8 text-xs">
                Enregistrer la dette
              </Button>
            </div>
          </form>
        )}

        {/* Avertissement si plusieurs prêts (donnée legacy à fusionner) */}
        {mortgageLoansList.length > 1 && (
          <div className="flex gap-2 items-start rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/20 px-3 py-2 mb-3 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-900 dark:text-amber-100">
              <strong>{mortgageLoansList.length} prêts hypothécaires</strong> sont enregistrés pour ce bien. Si vous n&apos;avez qu&apos;une seule dette en réalité, supprimez les lignes en trop ci-dessous pour que le calcul des intérêts (CHF{" "}
              {formatChf(property.finance.monthlyInterest)}/mois) corresponde à votre attente.
            </p>
          </div>
        )}

        {/* Sous-bloc par prêt */}
        <div className="flex flex-col gap-3">
          {mortgageLoansList.map((loan, idx) => (
            <MortgageLoanBlock key={loan.loanId} loan={loan} loanIndex={idx} />
          ))}
        </div>

        {/* Ajout d'un nouveau prêt (utile si le user veut ajouter plusieurs vraies lignes) */}
        {mortgageLoansList.length > 0 && (
          <details className="mt-3">
            <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
              + Ajouter un autre prêt hypothécaire
            </summary>
            <form action={createMortgageLoanAction} className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 items-end">
              <input type="hidden" name="propertyId" value={property.id} />
              <input type="hidden" name="loanKind" value="mortgage" />
              <label className="flex flex-col gap-0.5 col-span-2">
                <span className="text-[9px] uppercase text-muted-foreground">Libellé</span>
                <input name="label" placeholder="ex: Prêt 2e rang" className={inputClass} />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-muted-foreground">Capital CHF</span>
                <input name="principalTotal" type="number" step="0.01" placeholder="100000" className={inputClass} />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-muted-foreground">Taux %</span>
                <input name="amortizationRatePct" type="number" step="0.0001" placeholder="1.85" className={inputClass} />
              </label>
              <Button type="submit" size="sm" variant="outline" className="rounded-lg h-8 text-xs col-span-2 sm:col-span-4">
                Créer le prêt
              </Button>
            </form>
          </details>
        )}
      </section>

      {/* Avertissement amortissement legacy */}
      {legacyAmortizationLoans.length > 0 && (
        <section className="px-5 py-4 border-t border-border/60">
          <div className="flex gap-2 items-start rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/20 px-3 py-2 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-amber-900 dark:text-amber-100 mb-2">
                <strong>{legacyAmortizationLoans.length} ligne{legacyAmortizationLoans.length > 1 ? "s" : ""} d&apos;amortissement (ancien modèle)</strong> sont encore enregistrées. Le nouveau calcul utilise un taux d&apos;amortissement au niveau du bien (voir bloc « Amortissement » ci-dessous). Vous pouvez supprimer ces anciennes lignes en toute sécurité.
              </p>
              <ul className="flex flex-col gap-1.5">
                {legacyAmortizationLoans.map((l) => (
                  <li
                    key={l.loanId}
                    className="rounded-lg border border-border/60 bg-background px-2 py-1.5 flex items-center justify-between gap-2"
                  >
                    <span className="text-foreground">
                      {l.label} · CHF {formatChf(l.totalDebt)} @ {formatPct(l.weightedRatePct)} ({l.amortizationMode})
                    </span>
                    <DeleteMortgageLoanButton loanId={l.loanId} label={l.label} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Bloc 3 : Amortissement */}
      <section className="px-5 py-4 border-t border-border/60">
        <header className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-semibold text-foreground">Amortissement</h4>
          <p className="text-[11px] text-muted-foreground">
            Annuel : CHF {formatChf(property.finance.annualAmortization)} · Mensuel : CHF{" "}
            {formatChf(property.finance.monthlyAmortization)}
          </p>
        </header>
        <form action={updatePropertyAmortizationAction} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <input type="hidden" name="propertyId" value={property.id} />
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Mode</span>
            <select name="amortizationMode" defaultValue={property.finance.amortizationMode} className={inputClass}>
              <option value="direct">Direct (rembourse la dette)</option>
              <option value="indirect">Indirect (3e pilier)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Taux annuel (%) — modifiable
            </span>
            <input
              name="amortizationRatePct"
              type="number"
              step="0.0001"
              min="0"
              defaultValue={property.finance.amortizationRatePct}
              className={inputClass}
            />
          </label>
          <Button type="submit" size="sm" variant="outline" className="rounded-lg h-8 text-xs">
            Mettre à jour
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2">
          Calcul : dette × taux ÷ 100 = amortissement annuel. Standard suisse 2e rang : 1,25 %.
        </p>
      </section>

      {/* Bloc 4 : Charges PPE */}
      <section className="px-5 py-4 border-t border-border/60">
        <header className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-semibold text-foreground">Charges PPE et frais récurrents</h4>
          <p className="text-[11px] text-muted-foreground">
            Total mensualisé : CHF {formatChf(property.finance.monthlyExtraCharges)}
          </p>
        </header>
        {property.charges.length > 0 && (
          <ul className="flex flex-col gap-1.5 mb-3">
            {property.charges.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border/60 bg-background px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {CHARGE_TYPE_LABEL[c.chargeType] ?? c.chargeType}
                  </span>
                  <span className="font-medium text-foreground">{c.label}</span>
                  <span className="text-muted-foreground">
                    CHF {formatChf(c.amount, { decimals: 2 })} {FREQ_LABEL[c.frequency] ?? ""}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ≈ CHF {formatChf(c.monthlyEquivalent, { decimals: 2 })} / mois
                  </span>
                </div>
                <DeletePropertyChargeButton chargeId={c.id} />
              </li>
            ))}
          </ul>
        )}
        <form action={addPropertyChargeAction} className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 items-end">
          <input type="hidden" name="propertyId" value={property.id} />
          <label className="flex flex-col gap-0.5 col-span-2">
            <span className="text-[9px] uppercase text-muted-foreground">Libellé</span>
            <input name="label" placeholder="ex: PPE Orbe" className={inputClass} />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase text-muted-foreground">Type</span>
            <select name="chargeType" defaultValue="ppe" className={inputClass}>
              <option value="ppe">PPE</option>
              <option value="maintenance">Entretien</option>
              <option value="insurance">Assurance</option>
              <option value="utilities">Énergie/Eau</option>
              <option value="tax">Taxe</option>
              <option value="other">Autre</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase text-muted-foreground">Montant CHF</span>
            <input name="amount" type="number" step="0.01" placeholder="350" className={inputClass} />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase text-muted-foreground">Fréquence</span>
            <select name="frequency" defaultValue="monthly" className={inputClass}>
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="annual">Annuel</option>
            </select>
          </label>
          <Button type="submit" size="sm" variant="outline" className="rounded-lg h-8 text-xs gap-1 col-span-2 sm:col-span-1">
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </Button>
        </form>
      </section>
    </article>
  )
}

function MortgageLoanBlock({ loan, loanIndex }: { loan: PropertyMortgageView; loanIndex: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3">
      <header className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Prêt #{loanIndex + 1} : {loan.label}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Capital CHF {formatChf(loan.totalDebt)} · Taux moyen {formatPct(loan.weightedRatePct)} ·{" "}
            {loan.tranches.length} tranche{loan.tranches.length > 1 ? "s" : ""}
            {loan.isVirtual ? " (saisie directe sans tranche)" : ""}
          </p>
        </div>
        <DeleteMortgageLoanButton loanId={loan.loanId} label={loan.label} />
      </header>

      {/* Cas saisie directe sans tranche */}
      {loan.isVirtual && (
        <div className="flex gap-2 items-start rounded-lg border border-blue-200/50 bg-blue-50/50 dark:bg-blue-900/20 px-2.5 py-1.5 mb-2 text-[10px] text-blue-900 dark:text-blue-100">
          <span>
            Ce prêt n&apos;a pas de tranches détaillées. Le calcul utilise capital × taux directement. Ajoutez une ou plusieurs tranches ci-dessous pour affiner.
          </span>
        </div>
      )}

      {/* Liste des tranches */}
      {loan.tranches.length > 0 && (
        <ul className="flex flex-col gap-1.5 mb-2">
          {loan.tranches.map((t) => (
            <li key={t.id} className="rounded-lg border border-border/60 bg-muted/30 px-2 py-1.5">
              <form action={updateMortgageTrancheAction} className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 items-end">
                <input type="hidden" name="trancheId" value={t.id} />
                <label className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[9px] uppercase text-muted-foreground">Tranche</span>
                  <input name="name" defaultValue={t.name ?? ""} placeholder="Tranche" className={inputClass} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-muted-foreground">Capital CHF</span>
                  <input name="principal" type="number" step="0.01" defaultValue={t.principal} className={inputClass} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-muted-foreground">Taux %</span>
                  <input name="ratePct" type="number" step="0.0001" defaultValue={t.ratePct} className={inputClass} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-muted-foreground">Type</span>
                  <select name="rateType" defaultValue={t.rateType} className={inputClass}>
                    <option value="fixed">Fixe</option>
                    <option value="saron">SARON</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase text-muted-foreground">Échéance</span>
                  <input name="endDate" type="date" defaultValue={isoDate(t.endDate)} className={inputClass} />
                </label>
                <div className="flex gap-1 justify-end">
                  <Button type="submit" size="sm" variant="ghost" className="rounded-lg h-7 text-[11px] px-2">
                    Mettre à jour
                  </Button>
                  <Button
                    formAction={deleteMortgageTrancheAction}
                    name="trancheId"
                    value={t.id}
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-7 text-[11px] px-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Ajout d'une tranche */}
      <form action={addMortgageTrancheAction} className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 items-end">
        <input type="hidden" name="loanId" value={loan.loanId} />
        <label className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
          <span className="text-[9px] uppercase text-muted-foreground">Nouvelle tranche</span>
          <input name="name" placeholder="ex: T1" className={inputClass} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase text-muted-foreground">Capital CHF</span>
          <input name="principal" type="number" step="0.01" placeholder="200000" className={inputClass} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase text-muted-foreground">Taux %</span>
          <input name="ratePct" type="number" step="0.0001" placeholder="1.85" className={inputClass} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase text-muted-foreground">Type</span>
          <select name="rateType" defaultValue="fixed" className={inputClass}>
            <option value="fixed">Fixe</option>
            <option value="saron">SARON</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase text-muted-foreground">Échéance</span>
          <input name="endDate" type="date" className={inputClass} />
        </label>
        <Button type="submit" size="sm" variant="outline" className="rounded-lg h-8 text-xs gap-1">
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </Button>
      </form>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: "primary" | "income"
}) {
  const accentClass =
    accent === "primary"
      ? "border-[oklch(0.56_0.15_162)/0.30] bg-[oklch(0.56_0.15_162)/0.06]"
      : accent === "income"
        ? "border-emerald-300/40 bg-emerald-50/60 dark:bg-emerald-900/20"
        : "border-border/70 bg-background"
  return (
    <div className={`rounded-xl border ${accentClass} px-3 py-2`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  )
}
