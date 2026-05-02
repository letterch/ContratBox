import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, User, FileText, MessageSquare, Send, Download, AlertTriangle } from "lucide-react"
import { getContractById } from "@/lib/services/contract"
import { auth } from "@/lib/auth"
import { CONTRACT_CATEGORIES } from "@/lib/constants"
import { calculateCancellationDeadline } from "@/lib/services/contract-deadline"
import { getMortgagePlan } from "@/lib/services/mortgage"
import { analyzeMortgageContractDecision } from "@/lib/services/mortgage-recommendation"
import {
  buildContractCancellationNextLetterUrl,
  buildMortgageBankLetterNextLetterUrl,
} from "@/lib/services/nextletter"
import { getMortgageMarketBenchmarkRatePct } from "@/lib/services/mortgage-benchmark"
import { getAppFeatures } from "@/lib/services/feature-flags"
import { canUseMortgageSimulatorForUser } from "@/lib/services/subscription"
import { MortgageSimulator } from "@/components/contracts/mortgage-simulator"
import { getKeyDateFromContractLike, parseUnknownDate } from "@/lib/services/contract-key-date"
import { DeleteContractButton } from "@/components/contracts/delete-contract-button"
import { ContractRemindersList } from "@/components/contracts/contract-reminders-list"

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) notFound()
  const { id } = await params
  const contract = await getContractById(id, session.user.id)
  if (!contract) notFound()

  const categoryLabel = contract.category ? CONTRACT_CATEGORIES[contract.category as keyof typeof CONTRACT_CATEGORIES] ?? contract.category : "—"
  const memberLabel = contract.isHouseholdWide ? "Ménage" : contract.member ? `${contract.member.firstName} ${contract.member.lastName ?? ""}`.trim() : "—"
  const premium = contract.premiumAmount != null ? Number(contract.premiumAmount) : null
  const rawExtraction = (contract.rawExtraction ?? {}) as Record<string, unknown>
  const renewalDate = contract.renewalDate ? new Date(contract.renewalDate) : parseUnknownDate(rawExtraction.renewalDate)
  const maturityDate = contract.maturityDate ? new Date(contract.maturityDate) : parseUnknownDate(rawExtraction.maturityDate)
  const endDate = contract.endDate ? new Date(contract.endDate) : parseUnknownDate(rawExtraction.endDate)
  const keyDate = getKeyDateFromContractLike(contract)
  const keyDateLabel = renewalDate ? "Renouvellement" : maturityDate ? "Échéance hypothécaire" : endDate ? "Fin de contrat" : "Échéance"
  const cancelDeadline = contract.cancellationDeadline
    ? new Date(contract.cancellationDeadline)
    : calculateCancellationDeadline(
        keyDate,
        contract.cancellationNoticeDays ?? null,
        Number(rawExtraction.cancellationNoticeValue),
        rawExtraction.cancellationNoticeUnit as "days" | "months" | "years" | null
      )
  const daysToCancel = cancelDeadline ? Math.ceil((cancelDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
  const minimumCommitmentLabel =
    rawExtraction.minimumCommitmentValue != null
      ? `${String(rawExtraction.minimumCommitmentValue)} ${String(rawExtraction.minimumCommitmentUnit ?? "mois")}`
      : null
  const leaseMonthlyRent = Number(rawExtraction.leaseMonthlyRent ?? 0) || 0
  const leaseMonthlyCharges = Number(rawExtraction.leaseMonthlyCharges ?? 0) || 0
  const leaseTotalMonthly = leaseMonthlyRent + leaseMonthlyCharges
  const leaseTacitRenewal =
    typeof rawExtraction.leaseTacitRenewal === "boolean"
      ? rawExtraction.leaseTacitRenewal
      : null
  const leaseEndDate = rawExtraction.leaseEndDate
    ? new Date(String(rawExtraction.leaseEndDate))
    : contract.endDate
      ? new Date(contract.endDate)
      : null
  const leaseNoticeValue = Number(rawExtraction.leaseNoticeValue)
  const leaseNoticeUnit = rawExtraction.leaseNoticeUnit as "days" | "months" | "years" | null
  const leaseNoticeDays =
    contract.cancellationNoticeDays ??
    (Number.isFinite(leaseNoticeValue)
      ? leaseNoticeUnit === "months"
        ? Math.round(leaseNoticeValue * 30)
        : leaseNoticeUnit === "years"
          ? Math.round(leaseNoticeValue * 365)
          : Math.round(leaseNoticeValue)
      : null)
  const leaseNoticeDeadline =
    leaseEndDate && leaseNoticeDays
      ? new Date(leaseEndDate.getTime() - leaseNoticeDays * 24 * 60 * 60 * 1000)
      : null
  const leaseDaysToNotice =
    leaseNoticeDeadline
      ? Math.ceil((leaseNoticeDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null
  const mortgagePlan = getMortgagePlan({
    id: contract.id,
    provider: contract.provider,
    startDate: contract.startDate,
    maturityDate: contract.maturityDate,
    mortgageRate: contract.mortgageRate ? Number(contract.mortgageRate) : null,
    rawExtraction: contract.rawExtraction,
  })
  const appFeatures = await getAppFeatures()
  const isProUser = await canUseMortgageSimulatorForUser(session.user.id)
  const canUseSimulator =
    appFeatures.mortgageSimulatorEnabled &&
    (!appFeatures.mortgageSimulatorProOnly || isProUser || session.user.role === "admin")
  const nextLetterUrl = buildContractCancellationNextLetterUrl({
    provider: contract.provider,
    policyNumber: contract.policyNumber,
    contractTitle: contract.title ?? contract.provider,
    category: contract.category,
    noticeDays: contract.cancellationNoticeDays,
    renewalDateIso: renewalDate ? renewalDate.toISOString().slice(0, 10) : null,
    memberName: memberLabel && memberLabel !== "Ménage" ? memberLabel : null,
    extraContext: contract.coverageSummary?.slice(0, 400) ?? null,
  })

  const mortgageDecision =
    contract.category === "mortgage"
      ? analyzeMortgageContractDecision({
          id: contract.id,
          provider: contract.provider,
          startDate: contract.startDate,
          maturityDate: contract.maturityDate,
          mortgageRate: contract.mortgageRate ? Number(contract.mortgageRate) : null,
          rawExtraction: contract.rawExtraction,
          category: contract.category,
        })
      : null

  const benchmarkRate = getMortgageMarketBenchmarkRatePct()
  const expiringSoonTranches = mortgagePlan.isMortgage
    ? [...mortgagePlan.tranches]
        .filter((t) => t.daysToMaturity != null && t.daysToMaturity >= 0 && t.daysToMaturity <= 540)
        .sort((a, b) => (a.daysToMaturity ?? 1e9) - (b.daysToMaturity ?? 1e9))
    : []
  const primaryTranche = expiringSoonTranches[0] ?? mortgagePlan.tranches[0]
  const bankLetterUrl =
    contract.category === "mortgage"
      ? buildMortgageBankLetterNextLetterUrl({
          bankName: contract.provider,
          contractTitle: contract.title ?? contract.provider,
          principalChf: mortgagePlan.principalTotal > 0 ? mortgagePlan.principalTotal : null,
          currentRatePct: primaryTranche?.annualRate ?? null,
          benchmarkRatePct: benchmarkRate,
          maturityIso: primaryTranche?.endDate ? primaryTranche.endDate.toISOString().slice(0, 10) : null,
          context:
            mortgageDecision && mortgageDecision.savingsPotential > 0
              ? `Potentiel intérêts ~CHF ${mortgageDecision.savingsPotential}/an (indicatif, non garanti).`
              : undefined,
        })
      : ""

  const firstDoc = contract.documents[0]

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-8">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/contracts" className="p-2 rounded-xl bg-muted hover:bg-accent transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-foreground">{contract.provider ?? contract.title ?? "Sans nom"}</h1>
              <p className="text-xs text-muted-foreground">{categoryLabel} · {memberLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {firstDoc && (
              <>
              <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" asChild>
                <Link href={`/api/documents/${firstDoc.id}/download?inline=1`} target="_blank">
                  Consulter
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" asChild>
                <Link href={`/api/documents/${firstDoc.id}/download`}>
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </Link>
              </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" asChild>
              <Link href={`/contracts/${contract.id}/edit`}>
                Modifier
              </Link>
            </Button>
            <DeleteContractButton contractId={contract.id} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        <div className="relative rounded-2xl bg-gradient-to-br from-[oklch(0.18_0.07_255)] to-[oklch(0.22_0.10_240)] border border-white/10 p-6 sm:p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[oklch(0.58_0.18_220)] opacity-10 blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-0.5">{categoryLabel}</p>
                  <h2 className="text-2xl font-bold text-white">{contract.provider ?? contract.title ?? "Sans nom"}</h2>
                  <p className="text-white/50 text-sm">{contract.contractType ?? "—"}</p>
                </div>
              </div>
              {daysToCancel != null && daysToCancel <= 30 && (
                <Badge className="bg-[oklch(0.57_0.20_25)]/20 text-[oklch(0.80_0.15_25)] border border-[oklch(0.57_0.20_25)]/30 text-xs">
                  {daysToCancel <= 14 ? "Urgent" : "Bientôt"} — {daysToCancel}j
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Prime</p>
                <p className="text-white font-bold text-lg">{premium != null ? `CHF ${premium.toLocaleString("fr-CH")}` : "—"}/{contract.premiumFrequency === "annual" ? "an" : "mois"}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{keyDateLabel}</p>
                <p className="text-white font-bold text-lg">{keyDate ? keyDate.toLocaleDateString("fr-CH") : "—"}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Préavis</p>
                <p className="text-white font-bold text-lg">{contract.cancellationNoticeDays ? `${contract.cancellationNoticeDays} jours` : "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {daysToCancel != null && daysToCancel > 0 && daysToCancel <= 60 && (
          <div className="rounded-xl bg-[oklch(0.57_0.20_25)]/8 border border-[oklch(0.57_0.20_25)]/20 px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-[oklch(0.57_0.20_25)] flex-shrink-0" />
            <p className="text-sm text-foreground flex-1">
              La fenêtre de résiliation se ferme dans <strong>{daysToCancel} jours</strong>. Si vous ne résiliez pas, le contrat sera automatiquement renouvelé.
            </p>
            <Button size="sm" className="rounded-xl bg-[oklch(0.57_0.20_25)] hover:bg-[oklch(0.52_0.20_25)] text-white text-xs flex-shrink-0 gap-1.5" asChild>
              <a href={nextLetterUrl} target="_blank" rel="noopener noreferrer">
                <Send className="w-3.5 h-3.5" />
                Générer la lettre avec NextLetter
              </a>
            </Button>
          </div>
        )}

        {contract.reminders.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <h3 className="font-semibold text-foreground text-sm mb-3">Rappels liés à ce contrat</h3>
            <ContractRemindersList
              items={contract.reminders.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                dueDate: r.dueDate.toISOString(),
                urgencyLevel: r.urgencyLevel,
                estimatedImpactChfYear: r.estimatedImpactChfYear != null ? Number(r.estimatedImpactChfYear) : null,
              }))}
            />
          </div>
        )}

        {contract.decisionInsight && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
            <h3 className="font-semibold text-foreground text-sm">Analyse IA structurée</h3>
            <p className="text-xs text-muted-foreground">
              Indicatif uniquement — à croiser avec vos documents et votre interlocuteur. Priorité{" "}
              {contract.decisionInsight.priorityScore}/100.
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{contract.decisionInsight.nextAction}</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>Risque : {contract.decisionInsight.riskLevel}</span>
              <span>Urgence : {contract.decisionInsight.urgencyLevel}</span>
              <span>
                Impact estimé : CHF {Number(contract.decisionInsight.estimatedImpactChfYear).toLocaleString("fr-CH")} / an
              </span>
              {contract.decisionInsight.canCancelNow ? <span className="text-[oklch(0.57_0.20_25)]">Résiliation possible (selon analyse)</span> : null}
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs mt-2" asChild>
              <Link href="/ai">Relancer une analyse depuis l’assistant</Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-card rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Informations du contrat
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { label: "Prestataire", value: contract.provider },
                  { label: "N° de contrat", value: contract.policyNumber },
                  { label: "Date de début", value: contract.startDate ? new Date(contract.startDate).toLocaleDateString("fr-CH") : null },
                  { label: "Renouvellement auto", value: contract.autoRenewal != null ? (contract.autoRenewal ? "Oui" : "Non") : null },
                  { label: "Préavis résiliation", value: contract.cancellationNoticeDays ? `${contract.cancellationNoticeDays} jours avant` : null },
                  { label: "Durée minimale", value: minimumCommitmentLabel },
                ].filter((f) => f.value).map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-foreground">{String(f.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {(contract.coverageSummary || contract.exclusions) && (
              <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                {contract.coverageSummary && (
                  <>
                    <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                      <Badge className="bg-[oklch(0.56_0.15_162)]/10 text-[oklch(0.56_0.15_162)] border-0 text-xs">Résumé</Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap mb-4">{contract.coverageSummary}</p>
                  </>
                )}
                {contract.exclusions && (
                  <>
                    <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                      <Badge className="bg-[oklch(0.57_0.20_25)]/10 text-[oklch(0.57_0.20_25)] border-0 text-xs">Exclusions</Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{contract.exclusions}</p>
                  </>
                )}
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Dates clés
              </h3>
              <div className="flex flex-col gap-2">
                {contract.startDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Début</span>
                    <span className="font-medium">{new Date(contract.startDate).toLocaleDateString("fr-CH")}</span>
                  </div>
                )}
                {renewalDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Renouvellement</span>
                    <span className="font-medium">{renewalDate.toLocaleDateString("fr-CH")}</span>
                  </div>
                )}
                {maturityDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Échéance hypothécaire</span>
                    <span className="font-medium">{maturityDate.toLocaleDateString("fr-CH")}</span>
                  </div>
                )}
                {endDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fin de contrat</span>
                    <span className="font-medium">{endDate.toLocaleDateString("fr-CH")}</span>
                  </div>
                )}
                {cancelDeadline && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dernier délai résiliation</span>
                    <span className="font-medium">{cancelDeadline.toLocaleDateString("fr-CH")}</span>
                  </div>
                )}
              </div>
            </div>

            {mortgagePlan.isMortgage && (
              <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">Vision hypothécaire</h3>
                {mortgageDecision && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5 text-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Décision · économies</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Échéance la plus proche</p>
                        <p className="font-semibold text-foreground">
                          {mortgageDecision.expiresInDays >= 9990 ? "—" : `${mortgageDecision.expiresInDays} j.`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Potentiel intérêts / an</p>
                        <p className="font-semibold text-[oklch(0.56_0.15_162)]">
                          CHF {mortgageDecision.savingsPotential.toLocaleString("fr-CH")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Recommandation</p>
                        <p className="font-semibold text-foreground">
                          {mortgageDecision.recommendation === "renegotiate" ? "Renégocier" : "Conserver / surveiller"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-muted/20 p-4 mb-5 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P0 — taux & échéances</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Taux de référence (benchmark)</p>
                      <p className="font-semibold text-foreground">{benchmarkRate.toFixed(2)} % fixe indicatif</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Spread vs tranche principale</p>
                      <p className="font-semibold text-foreground">
                        {primaryTranche
                          ? `${(primaryTranche.annualRate - benchmarkRate).toFixed(2)} pts (taux tranche ${primaryTranche.annualRate.toFixed(2)} %)`
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {expiringSoonTranches.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">Tranches qui expirent dans les 18 mois</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {expiringSoonTranches.map((t) => (
                          <li key={t.name + (t.endDate?.toISOString() ?? "")}>
                            <span className="text-foreground font-medium">{t.name}</span> — fin{" "}
                            {t.endDate ? t.endDate.toLocaleDateString("fr-CH") : "?"}
                            {t.daysToMaturity != null ? ` · ${t.daysToMaturity} j.` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {bankLetterUrl ? (
                    <Button size="sm" className="rounded-xl text-xs gap-2 w-full sm:w-auto" asChild>
                      <a href={bankLetterUrl} target="_blank" rel="noopener noreferrer">
                        <Send className="w-3.5 h-3.5" />
                        Préparer une lettre à la banque avec NextLetter
                      </a>
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Capital total</p>
                    <p className="text-sm font-semibold">CHF {mortgagePlan.principalTotal.toLocaleString("fr-CH")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Intérêts estimés</p>
                    <p className="text-sm font-semibold">CHF {mortgagePlan.totalInterestEstimate.toLocaleString("fr-CH")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amortissement estimé</p>
                    <p className="text-sm font-semibold">CHF {mortgagePlan.totalAmortizationEstimate.toLocaleString("fr-CH")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coût total estimé</p>
                    <p className="text-sm font-semibold">CHF {mortgagePlan.totalCostEstimate.toLocaleString("fr-CH")}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {mortgagePlan.tranches.map((tranche) => {
                    const elapsedRatio =
                      tranche.startDate && tranche.endDate
                        ? Math.min(
                            1,
                            Math.max(
                              0,
                              (Date.now() - tranche.startDate.getTime()) /
                                Math.max(1, tranche.endDate.getTime() - tranche.startDate.getTime())
                            )
                          )
                        : 0
                    return (
                      <div key={`${tranche.name}-${tranche.endDate?.toISOString() ?? "na"}`} className="rounded-xl border border-border p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{tranche.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tranche.amortizationType === "direct" ? "Amortissement direct" : tranche.amortizationType === "indirect" ? "Amortissement indirect" : "Amortissement non précisé"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{tranche.annualRate.toFixed(2)}%</p>
                            <p className="text-[10px] text-muted-foreground">
                              {tranche.daysToMaturity != null ? `${tranche.daysToMaturity}j restants` : "Échéance non définie"}
                            </p>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-2">
                          <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(elapsedRatio * 100)}%` }} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <p className="text-muted-foreground">Capital: <span className="text-foreground font-medium">CHF {tranche.principal.toLocaleString("fr-CH")}</span></p>
                          <p className="text-muted-foreground">Durée: <span className="text-foreground font-medium">{tranche.durationMonths} mois</span></p>
                          <p className="text-muted-foreground">Intérêts: <span className="text-foreground font-medium">CHF {tranche.totalInterestEstimate.toLocaleString("fr-CH")}</span></p>
                          <p className="text-muted-foreground">Amort.: <span className="text-foreground font-medium">CHF {tranche.totalAmortizationEstimate.toLocaleString("fr-CH")}</span></p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {mortgagePlan.isMortgage && canUseSimulator && (
              <MortgageSimulator
                tranches={mortgagePlan.tranches.map((t) => ({
                  name: t.name,
                  principal: t.principal,
                  annualRate: t.annualRate,
                  durationMonths: t.durationMonths,
                  amortizationType: t.amortizationType,
                }))}
                baselineInterest={mortgagePlan.totalInterestEstimate}
                baselineAmortization={mortgagePlan.totalAmortizationEstimate}
              />
            )}
            {mortgagePlan.isMortgage && !canUseSimulator && (
              <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                <h3 className="font-semibold text-foreground text-sm mb-1">Simulateur hypothécaire</h3>
                <p className="text-xs text-muted-foreground">
                  Cette option est réservée aux abonnements Pro. Vous pouvez l’activer ou la rendre publique depuis l’admin.
                </p>
              </div>
            )}
            {contract.category === "rent_lease" && appFeatures.leaseInsightsEnabled && (
              <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">Vision bail locatif</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Loyer</p>
                    <p className="text-sm font-semibold">CHF {leaseMonthlyRent.toLocaleString("fr-CH")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Charges</p>
                    <p className="text-sm font-semibold">CHF {leaseMonthlyCharges.toLocaleString("fr-CH")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total mensuel</p>
                    <p className="text-sm font-semibold">CHF {leaseTotalMonthly.toLocaleString("fr-CH")}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reconduction tacite</p>
                    <p className="text-sm font-semibold">{leaseTacitRenewal == null ? "Non précisé" : leaseTacitRenewal ? "Oui" : "Non"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Échéance bail</p>
                    <p className="text-sm font-semibold">{leaseEndDate ? leaseEndDate.toLocaleDateString("fr-CH") : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Préavis</p>
                    <p className="text-sm font-semibold">{leaseNoticeDays ? `${leaseNoticeDays} jours` : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Countdown résiliation</p>
                    <p className="text-sm font-semibold">{leaseDaysToNotice != null ? `${leaseDaysToNotice} jours` : "—"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-card rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Résumé financier</h3>
              <div className="flex flex-col gap-3">
                {premium != null && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{contract.premiumFrequency === "annual" ? "Annuel" : "Mensuel"}</span>
                      <span className="text-sm font-semibold">CHF {premium.toLocaleString("fr-CH")}</span>
                    </div>
                    {contract.premiumFrequency === "monthly" && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Annuel (projeté)</span>
                        <span className="text-sm font-semibold">CHF {(premium * 12).toLocaleString("fr-CH")}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Membre assigné
              </h3>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-xs font-bold">
                    {contract.member ? `${contract.member.firstName[0]}${contract.member.lastName?.[0] ?? ""}`.toUpperCase() : "M"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{memberLabel}</p>
                  <p className="text-xs text-muted-foreground">{contract.isHouseholdWide ? "Ménage entier" : "Titulaire"}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button className="w-full rounded-xl bg-primary text-primary-foreground shadow-brand gap-2 justify-start" asChild>
                <Link href="/ai">
                  <MessageSquare className="w-4 h-4" />
                  Poser une question à l'IA
                </Link>
              </Button>
              <Button variant="outline" className="w-full rounded-xl gap-2 justify-start text-[oklch(0.57_0.20_25)] border-[oklch(0.57_0.20_25)]/30 hover:bg-[oklch(0.57_0.20_25)]/5" asChild>
                <a href={nextLetterUrl} target="_blank" rel="noopener noreferrer">
                  <Send className="w-4 h-4" />
                  Générer la lettre avec NextLetter
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
