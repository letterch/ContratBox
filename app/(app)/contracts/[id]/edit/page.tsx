"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getContractEditData, updateContractManually } from "@/app/actions/contracts"
import { CONTRACT_CATEGORIES, CONTRACT_CATEGORY_SLUGS } from "@/lib/constants"

type EditData = Awaited<ReturnType<typeof getContractEditData>>

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<EditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    provider: "",
    contractType: "",
    category: "other",
    policyNumber: "",
    isHouseholdWide: true,
    memberId: "",
    premiumAmount: "",
    premiumFrequency: "monthly",
    startDate: "",
    renewalDate: "",
    endDate: "",
    maturityDate: "",
    cancellationNoticeDays: "",
    mortgageRate: "",
    coverageSummary: "",
    exclusions: "",
    importantClauses: "",
    rentalRole: "tenant",
    minimumCommitmentValue: "",
    minimumCommitmentUnit: "months",
    minimumCommitmentEndDate: "",
  })
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { id } = await params
        const d = await getContractEditData(id)
        if (!mounted) return
        setData(d)
        const raw = (d.contract.rawExtraction as Record<string, unknown> | null) ?? {}
        setForm({
          provider: d.contract.provider ?? "",
          contractType: d.contract.contractType ?? "",
          category: d.contract.category ?? "other",
          policyNumber: d.contract.policyNumber ?? "",
          isHouseholdWide: d.contract.isHouseholdWide,
          memberId: d.contract.memberId ?? "",
          premiumAmount: d.contract.premiumAmount != null ? String(Number(d.contract.premiumAmount)) : "",
          premiumFrequency: d.contract.premiumFrequency ?? "monthly",
          startDate: d.contract.startDate ? new Date(d.contract.startDate).toISOString().slice(0, 10) : "",
          renewalDate: d.contract.renewalDate ? new Date(d.contract.renewalDate).toISOString().slice(0, 10) : "",
          endDate: d.contract.endDate ? new Date(d.contract.endDate).toISOString().slice(0, 10) : "",
          maturityDate: d.contract.maturityDate ? new Date(d.contract.maturityDate).toISOString().slice(0, 10) : "",
          cancellationNoticeDays: d.contract.cancellationNoticeDays != null ? String(d.contract.cancellationNoticeDays) : "",
          mortgageRate: d.contract.mortgageRate != null ? String(Number(d.contract.mortgageRate)) : "",
          coverageSummary: d.contract.coverageSummary ?? "",
          exclusions: d.contract.exclusions ?? "",
          importantClauses: d.contract.importantClauses ?? "",
          rentalRole:
            (raw.rentalRole as string) === "owner"
              ? "owner"
              : "tenant",
          minimumCommitmentValue: raw.minimumCommitmentValue != null ? String(raw.minimumCommitmentValue) : "",
          minimumCommitmentUnit:
            raw.minimumCommitmentUnit === "years" ? "years" : "months",
          minimumCommitmentEndDate:
            typeof raw.minimumCommitmentEndDate === "string" ? raw.minimumCommitmentEndDate.slice(0, 10) : "",
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [params])

  if (loading) {
    return <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">Chargement…</div>
  }
  if (!data) {
    return <div className="min-h-screen bg-background p-8 text-sm text-destructive">Impossible de charger le contrat.</div>
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link href={`/contracts/${data.contract.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Retour au contrat
          </Link>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-card p-5">
          <h1 className="text-lg font-semibold text-foreground mb-4">Modifier le contrat</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Prestataire</Label>
              <Input value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
              <Input value={form.contractType} onChange={(e) => setForm((p) => ({ ...p, contractType: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Catégorie</Label>
              <Select value={form.category} onValueChange={(value) => setForm((p) => ({ ...p, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_CATEGORY_SLUGS.map((slug) => (
                    <SelectItem key={slug} value={slug}>{CONTRACT_CATEGORIES[slug]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">N° contrat/police</Label>
              <Input value={form.policyNumber} onChange={(e) => setForm((p) => ({ ...p, policyNumber: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Assignation</Label>
              <Select
                value={form.isHouseholdWide ? "household" : form.memberId}
                onValueChange={(value) => setForm((p) => ({ ...p, isHouseholdWide: value === "household", memberId: value === "household" ? "" : value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="household">Ménage entier</SelectItem>
                  {data.members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName ?? ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Montant (CHF)</Label>
              <Input type="number" value={form.premiumAmount} onChange={(e) => setForm((p) => ({ ...p, premiumAmount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Fréquence</Label>
              <Select value={form.premiumFrequency} onValueChange={(value) => setForm((p) => ({ ...p, premiumFrequency: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="annual">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-muted-foreground mb-1 block">Date de début</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1 block">Date de renouvellement</Label><Input type="date" value={form.renewalDate} onChange={(e) => setForm((p) => ({ ...p, renewalDate: e.target.value }))} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1 block">Date de fin</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></div>
            {form.category === "mortgage" && (
              <div><Label className="text-xs text-muted-foreground mb-1 block">Maturité hypothécaire</Label><Input type="date" value={form.maturityDate} onChange={(e) => setForm((p) => ({ ...p, maturityDate: e.target.value }))} /></div>
            )}
            <div><Label className="text-xs text-muted-foreground mb-1 block">Préavis (jours)</Label><Input type="number" value={form.cancellationNoticeDays} onChange={(e) => setForm((p) => ({ ...p, cancellationNoticeDays: e.target.value }))} /></div>
            {form.category === "mortgage" && (
              <div><Label className="text-xs text-muted-foreground mb-1 block">Taux hypothécaire (%)</Label><Input type="number" step="0.01" value={form.mortgageRate} onChange={(e) => setForm((p) => ({ ...p, mortgageRate: e.target.value }))} /></div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Durée minimale</Label>
              <Input
                type="number"
                placeholder="Ex: 24"
                value={form.minimumCommitmentValue}
                onChange={(e) => setForm((p) => ({ ...p, minimumCommitmentValue: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Unité durée minimale</Label>
              <Select
                value={form.minimumCommitmentUnit}
                onValueChange={(value) => setForm((p) => ({ ...p, minimumCommitmentUnit: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="months">Mois</SelectItem>
                  <SelectItem value="years">Années</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Fin d'engagement minimale (optionnel)</Label>
              <Input
                type="date"
                value={form.minimumCommitmentEndDate}
                onChange={(e) => setForm((p) => ({ ...p, minimumCommitmentEndDate: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Si la date de renouvellement est vide, l'échéance sera déduite de cette durée/date.
              </p>
            </div>
            {form.category === "rent_lease" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Rôle locatif</Label>
                <Select value={form.rentalRole} onValueChange={(value) => setForm((p) => ({ ...p, rentalRole: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Locataire (charge)</SelectItem>
                    <SelectItem value="owner">Propriétaire (revenu)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Couvertures incluses</Label>
              <textarea
                value={form.coverageSummary}
                onChange={(e) => setForm((p) => ({ ...p, coverageSummary: e.target.value }))}
                className="w-full min-h-24 rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Exclusions</Label>
              <textarea
                value={form.exclusions}
                onChange={(e) => setForm((p) => ({ ...p, exclusions: e.target.value }))}
                className="w-full min-h-20 rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Clauses importantes</Label>
              <textarea
                value={form.importantClauses}
                onChange={(e) => setForm((p) => ({ ...p, importantClauses: e.target.value }))}
                className="w-full min-h-20 rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          <div className="mt-5 flex justify-end">
            <Button
              disabled={saving}
              className="rounded-xl"
              onClick={async () => {
                try {
                  setSaving(true)
                  setError("")
                  await updateContractManually({
                    id: data.contract.id,
                    provider: form.provider || null,
                    contractType: form.contractType || null,
                    category: form.category || null,
                    policyNumber: form.policyNumber || null,
                    isHouseholdWide: form.isHouseholdWide,
                    memberId: form.memberId || null,
                    premiumAmount: form.premiumAmount ? Number(form.premiumAmount) : null,
                    premiumFrequency: form.premiumFrequency || null,
                    startDate: form.startDate || null,
                    renewalDate: form.renewalDate || null,
                    endDate: form.endDate || null,
                    maturityDate: form.category === "mortgage" ? (form.maturityDate || null) : null,
                    cancellationNoticeDays: form.cancellationNoticeDays ? Number(form.cancellationNoticeDays) : null,
                    mortgageRate: form.category === "mortgage" && form.mortgageRate ? Number(form.mortgageRate) : null,
                    coverageSummary: form.coverageSummary || null,
                    exclusions: form.exclusions || null,
                    importantClauses: form.importantClauses || null,
                    rentalRole: form.category === "rent_lease" ? (form.rentalRole as "owner" | "tenant") : null,
                    minimumCommitmentValue: form.minimumCommitmentValue ? Number(form.minimumCommitmentValue) : null,
                    minimumCommitmentUnit: form.minimumCommitmentValue ? (form.minimumCommitmentUnit as "months" | "years") : null,
                    minimumCommitmentEndDate: form.minimumCommitmentEndDate || null,
                  })
                  router.push(`/contracts/${data.contract.id}`)
                  router.refresh()
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Erreur d'enregistrement")
                } finally {
                  setSaving(false)
                }
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
