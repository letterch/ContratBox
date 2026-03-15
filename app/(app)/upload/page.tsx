"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, Check, ChevronRight, Sparkles, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { uploadAndExtractContract, saveContractFromUpload, getUploadPageData } from "@/app/actions/contracts"
import { CONTRACT_CATEGORIES, CONTRACT_CATEGORY_SLUGS } from "@/lib/constants"
import type { SaveContractInput } from "@/app/actions/contracts"

type Step = "upload" | "extracting" | "review" | "done"

type ExtractedState = {
  extracted: Record<string, unknown>
  extractedText: string
  file: { r2Key: string; name: string; mimeType: string; sizeBytes: number }
}

function ReviewStep({
  extractedState,
  members,
  onSave,
  saving,
  saveError,
}: {
  extractedState: ExtractedState
  members: { id: string; firstName: string; lastName?: string | null }[]
  onSave: (data: SaveContractInput) => Promise<void>
  saving: boolean
  saveError: string
}) {
  const e = extractedState.extracted
  const [provider, setProvider] = useState(String(e.provider ?? ""))
  const [category, setCategory] = useState(String(e.suggestedCategory ?? e.category ?? "other"))
  const [memberId, setMemberId] = useState<string>("")
  const [isHouseholdWide, setIsHouseholdWide] = useState(!e.memberId)
  const [premiumAmount, setPremiumAmount] = useState(String(e.monthlyPremium ?? e.annualPremium ?? ""))
  const [premiumFreq, setPremiumFreq] = useState((e.premiumFrequency as string) ?? "monthly")
  const [startDate, setStartDate] = useState(e.startDate ? String(e.startDate).slice(0, 10) : "")
  const [renewalDate, setRenewalDate] = useState(e.renewalDate ? String(e.renewalDate).slice(0, 10) : "")
  const [policyNumber, setPolicyNumber] = useState(String(e.policyNumber ?? ""))
  const [cancellationNoticeDays, setCancellationNoticeDays] = useState(e.cancellationNoticeDays ? String(e.cancellationNoticeDays) : "")
  const [mortgagePrincipal, setMortgagePrincipal] = useState(
    e.mortgagePrincipal != null ? String(e.mortgagePrincipal) : ""
  )
  const [mortgageRate, setMortgageRate] = useState(e.mortgageRate != null ? String(e.mortgageRate) : "")
  const [amortizationType, setAmortizationType] = useState(
    String(e.amortizationType ?? "none")
  )
  const [leaseMonthlyRent, setLeaseMonthlyRent] = useState(
    e.leaseMonthlyRent != null ? String(e.leaseMonthlyRent) : ""
  )
  const [leaseMonthlyCharges, setLeaseMonthlyCharges] = useState(
    e.leaseMonthlyCharges != null ? String(e.leaseMonthlyCharges) : ""
  )
  const [leaseTacitRenewal, setLeaseTacitRenewal] = useState(
    String(e.leaseTacitRenewal ?? "unknown")
  )
  const [leaseEndDate, setLeaseEndDate] = useState(
    e.leaseEndDate ? String(e.leaseEndDate).slice(0, 10) : ""
  )

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const normalizedRawExtraction = {
      ...e,
      mortgagePrincipal: mortgagePrincipal ? parseFloat(mortgagePrincipal) : null,
      mortgageRate: mortgageRate ? parseFloat(mortgageRate) : null,
      amortizationType: amortizationType || null,
      leaseMonthlyRent: leaseMonthlyRent ? parseFloat(leaseMonthlyRent) : null,
      leaseMonthlyCharges: leaseMonthlyCharges ? parseFloat(leaseMonthlyCharges) : null,
      leaseTacitRenewal: leaseTacitRenewal === "yes" ? true : leaseTacitRenewal === "no" ? false : null,
      leaseEndDate: leaseEndDate || null,
    }
    const inferredMonthly = leaseMonthlyRent || leaseMonthlyCharges
      ? (parseFloat(leaseMonthlyRent || "0") + parseFloat(leaseMonthlyCharges || "0"))
      : null
    onSave({
      file: extractedState.file,
      provider: provider || null,
      category: category as SaveContractInput["category"],
      policyNumber: policyNumber || null,
      memberId: isHouseholdWide ? null : (memberId || null),
      isHouseholdWide,
      premiumAmount: premiumAmount ? parseFloat(premiumAmount) : inferredMonthly,
      premiumFrequency: premiumFreq === "annual" ? "annual" : "monthly",
      startDate: startDate || null,
      renewalDate: renewalDate || null,
      cancellationNoticeDays: cancellationNoticeDays ? parseInt(cancellationNoticeDays, 10) : null,
      mortgageRate: mortgageRate ? parseFloat(mortgageRate) : null,
      endDate: category === "rent_lease" ? (leaseEndDate || null) : null,
      extractedText: extractedState.extractedText || null,
      extractionConfidence: (e.confidenceScore as number) ?? null,
      coverageSummary: (e.keyCoverageSummary as string) ?? null,
      exclusions: (e.exclusions as string) ?? null,
      importantClauses: (e.importantClauses as string) ?? null,
      rawExtraction: normalizedRawExtraction,
    })
  }

  const confidence = (e.confidenceScore as number) ?? 0
  const isMortgage = category === "mortgage" || e.suggestedCategory === "mortgage"
  const isLease = category === "rent_lease" || e.suggestedCategory === "rent_lease"
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Informations extraites
          </h2>
          {confidence > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-[oklch(0.56_0.15_162)]/10 text-[oklch(0.56_0.15_162)] font-medium">{Math.round(confidence)}% confiance</span>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { label: "Prestataire", value: e.provider },
            { label: "Montant", value: e.monthlyPremium ?? e.annualPremium },
            { label: "Date de début", value: e.startDate },
            { label: "Renouvellement", value: e.renewalDate },
            { label: "Préavis (jours)", value: e.cancellationNoticeDays },
            { label: "Durée minimale", value: e.minimumCommitmentValue ? `${String(e.minimumCommitmentValue)} ${String(e.minimumCommitmentUnit ?? "mois")}` : null },
          ].filter((x) => x.value != null).map((item) => (
            <div key={String(item.label)} className="p-3 rounded-xl bg-muted/40">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-medium text-foreground">{String(item.value)}</p>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Vérifier et compléter
        </h2>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Prestataire</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded-xl h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Catégorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{CONTRACT_CATEGORY_SLUGS.map((c) => <SelectItem key={c} value={c}>{CONTRACT_CATEGORIES[c]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Assigner à</Label>
          <Select value={isHouseholdWide ? "household" : memberId} onValueChange={(v) => { if (v === "household") { setIsHouseholdWide(true); setMemberId("") } else { setIsHouseholdWide(false); setMemberId(v) } }}>
            <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Choisir un membre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="household">Ménage entier</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName ?? ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Montant (CHF)</Label>
          <Input type="number" step="0.01" value={premiumAmount} onChange={(e) => setPremiumAmount(e.target.value)} className="rounded-xl h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Fréquence</Label>
          <Select value={premiumFreq} onValueChange={setPremiumFreq}>
            <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="annual">Annuel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Date de début</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Date de renouvellement</Label>
          <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} className="rounded-xl h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">N° contrat / police</Label>
          <Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="rounded-xl h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Préavis (jours)</Label>
          <Input type="number" value={cancellationNoticeDays} onChange={(e) => setCancellationNoticeDays(e.target.value)} className="rounded-xl h-9 text-sm" />
        </div>
        {isMortgage && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Capital hypothécaire (CHF)</Label>
              <Input type="number" step="0.01" value={mortgagePrincipal} onChange={(e) => setMortgagePrincipal(e.target.value)} className="rounded-xl h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Taux hypothécaire (%)</Label>
              <Input type="number" step="0.001" value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} className="rounded-xl h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Amortissement</Label>
              <Select value={amortizationType} onValueChange={setAmortizationType}>
                <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun / non précisé</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="indirect">Indirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {isLease && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Loyer mensuel hors charges (CHF)</Label>
              <Input type="number" step="0.01" value={leaseMonthlyRent} onChange={(e) => setLeaseMonthlyRent(e.target.value)} className="rounded-xl h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Charges mensuelles (CHF)</Label>
              <Input type="number" step="0.01" value={leaseMonthlyCharges} onChange={(e) => setLeaseMonthlyCharges(e.target.value)} className="rounded-xl h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Renouvellement tacite</Label>
              <Select value={leaseTacitRenewal} onValueChange={setLeaseTacitRenewal}>
                <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Non précisé</SelectItem>
                  <SelectItem value="yes">Oui</SelectItem>
                  <SelectItem value="no">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Échéance du bail</Label>
              <Input type="date" value={leaseEndDate} onChange={(e) => setLeaseEndDate(e.target.value)} className="rounded-xl h-9 text-sm" />
            </div>
          </>
        )}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <Button type="submit" disabled={saving} className="w-full h-11 rounded-xl bg-primary text-primary-foreground shadow-brand mt-auto">
          <Check className="w-4 h-4 mr-2" />
          {saving ? "Enregistrement…" : "Enregistrer le contrat"}
        </Button>
      </form>
    </div>
  )
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>("upload")
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [extractedState, setExtractedState] = useState<ExtractedState | null>(null)
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const [pageData, setPageData] = useState<{ canAdd: boolean; members: { id: string; firstName: string; lastName?: string | null }[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getUploadPageData().then(setPageData)
  }, [])
  const members = pageData?.members ?? []
  const canAdd = pageData?.canAdd ?? true
  const categoryOptions = CONTRACT_CATEGORY_SLUGS.map((slug) => ({
    value: slug,
    label: CONTRACT_CATEGORIES[slug],
  }))
  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.firstName}${m.lastName ? ` ${m.lastName}` : ""}`,
  }))

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setStep("extracting")
    setSaveError("")
    const formData = new FormData()
    formData.set("file", file)
    const result = await uploadAndExtractContract(formData)
    if (!result.ok) {
      setSaveError(result.error)
      setStep("upload")
      return
    }
    setExtractedState({ extracted: result.extracted as Record<string, unknown>, extractedText: result.extractedText, file: result.file })
    setStep("review")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (!canAdd) {
    return (
      <div className="min-h-screen bg-background pb-32 lg:pb-8 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-muted-foreground">Vous avez atteint la limite de contrats gratuits. Passez à un abonnement pour en ajouter.</p>
        <Button asChild><Link href="/settings">Paramètres / Abonnement</Link></Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl bg-muted hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-foreground">Ajouter un contrat</h1>
            <p className="text-xs text-muted-foreground">Import par PDF, image ou saisie manuelle</p>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="border-b border-border bg-background/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2">
          {(["upload", "extracting", "review", "done"] as Step[]).map((s, i) => {
            const stepIdx = ["upload", "extracting", "review", "done"].indexOf(step)
            const thisIdx = i
            const done = stepIdx > thisIdx
            const active = stepIdx === thisIdx
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                  done ? "bg-[oklch(0.56_0.15_162)] text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={cn("text-xs hidden sm:block", active ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {["Import", "Extraction IA", "Vérification", "Terminé"][i]}
                </span>
                {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === "upload" && (
          <div className="flex flex-col gap-5">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-all",
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30 bg-card"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
              <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center">
                <Upload className={cn("w-7 h-7 transition-colors", dragging ? "text-primary" : "text-primary/60")} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground mb-1">
                  {dragging ? "Déposez votre fichier ici" : "Glissez-déposez votre contrat"}
                </p>
                <p className="text-sm text-muted-foreground">PDF, JPEG, PNG — jusqu'à 20 MB</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Extraction IA automatique des informations clés
              </div>
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou saisissez manuellement</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Manual form preview */}
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm mb-1.5 block">Prestataire</Label>
                <Input placeholder="Ex: Swisscom, AXA, Migros..." className="rounded-xl h-10" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Catégorie</Label>
                <Select>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Membre</Label>
                <Select>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Assigner à..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household">Ménage entier</SelectItem>
                    {memberOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Montant mensuel (CHF)</Label>
                <Input placeholder="89.00" className="rounded-xl h-10" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Date de renouvellement</Label>
                <Input type="date" className="rounded-xl h-10" />
              </div>
              <Button className="sm:col-span-2 h-11 rounded-xl bg-primary text-primary-foreground shadow-brand">Enregistrer le contrat</Button>
            </div>
          </div>
        )}

        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-spin border-t-primary" />
              <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground mb-1">Analyse IA en cours...</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Extraction des informations clés de "{fileName}"
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {["Lecture du document", "Identification du prestataire", "Extraction des montants", "Détection des dates clés"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0", i < 2 ? "bg-[oklch(0.56_0.15_162)]" : "bg-muted animate-pulse")}>
                    {i < 2 ? <Check className="w-2.5 h-2.5 text-white" /> : null}
                  </div>
                  <span className={cn("text-xs", i < 2 ? "text-[oklch(0.56_0.15_162)]" : "text-muted-foreground")}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "review" && extractedState && (
          <ReviewStep
            extractedState={extractedState}
            members={members}
            onSave={async (data) => {
              setSaving(true)
              setSaveError("")
              try {
                await saveContractFromUpload(data)
                setStep("done")
              } catch (e) {
                setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
              } finally {
                setSaving(false)
              }
            }}
            saving={saving}
            saveError={saveError}
          />
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[oklch(0.56_0.15_162)]/10 flex items-center justify-center">
              <Check className="w-9 h-9 text-[oklch(0.56_0.15_162)]" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground mb-2">Contrat enregistré !</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Swisscom Fibre a été ajouté à votre ménage. Vous serez alerté 30 jours avant l'échéance.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="rounded-xl bg-primary text-primary-foreground shadow-brand" asChild>
                <Link href="/contracts">Voir tous mes contrats</Link>
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setStep("upload")}>
                Ajouter un autre contrat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
