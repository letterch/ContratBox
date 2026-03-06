import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, User, FileText, MessageSquare, Send, Download, AlertTriangle } from "lucide-react"
import { getContractById } from "@/lib/services/contract"
import { auth } from "@/lib/auth"
import { CONTRACT_CATEGORIES } from "@/lib/constants"

const NEXTLETTER_BASE = process.env.NEXTLETTER_BASE_URL ?? "https://nextletter.ch"

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) notFound()
  const { id } = await params
  const contract = await getContractById(id, session.user.id)
  if (!contract) notFound()

  const categoryLabel = contract.category ? CONTRACT_CATEGORIES[contract.category as keyof typeof CONTRACT_CATEGORIES] ?? contract.category : "—"
  const memberLabel = contract.isHouseholdWide ? "Ménage" : contract.member ? `${contract.member.firstName} ${contract.member.lastName ?? ""}`.trim() : "—"
  const premium = contract.premiumAmount != null ? Number(contract.premiumAmount) : null
  const renewalDate = contract.renewalDate ? new Date(contract.renewalDate) : null
  const cancelDeadline = contract.cancellationDeadline ? new Date(contract.cancellationDeadline) : null
  const daysToCancel = cancelDeadline ? Math.ceil((cancelDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
  const nextLetterUrl = new URL(NEXTLETTER_BASE)
  nextLetterUrl.searchParams.set("provider", contract.provider ?? "")
  nextLetterUrl.searchParams.set("category", contract.category ?? "")
  if (contract.policyNumber) nextLetterUrl.searchParams.set("policy", contract.policyNumber)
  if (renewalDate) nextLetterUrl.searchParams.set("renewal", renewalDate.toISOString().slice(0, 10))
  if (contract.cancellationNoticeDays) nextLetterUrl.searchParams.set("notice", String(contract.cancellationNoticeDays))
  if (memberLabel && memberLabel !== "Ménage") nextLetterUrl.searchParams.set("member", memberLabel)

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
          {firstDoc && (
            <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" asChild>
              <Link href={`/api/documents/${firstDoc.id}/download`}>
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </Link>
            </Button>
          )}
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
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Renouvellement</p>
                <p className="text-white font-bold text-lg">{renewalDate ? renewalDate.toLocaleDateString("fr-CH") : "—"}</p>
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
              <a href={nextLetterUrl.toString()} target="_blank" rel="noopener noreferrer">
                <Send className="w-3.5 h-3.5" />
                Résilier via NextLetter
              </a>
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
                {contract.renewalDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Renouvellement</span>
                    <span className="font-medium">{new Date(contract.renewalDate).toLocaleDateString("fr-CH")}</span>
                  </div>
                )}
                {contract.cancellationDeadline && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dernier délai résiliation</span>
                    <span className="font-medium">{new Date(contract.cancellationDeadline).toLocaleDateString("fr-CH")}</span>
                  </div>
                )}
              </div>
            </div>
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
                <a href={nextLetterUrl.toString()} target="_blank" rel="noopener noreferrer">
                  <Send className="w-4 h-4" />
                  Résilier via NextLetter
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
