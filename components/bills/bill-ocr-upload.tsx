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
import { Card, CardContent } from "@/components/ui/card"
import {
  uploadAndExtractBillAction,
  confirmBillFromExtractionAction,
} from "@/app/actions/bills"
import {
  BILL_CATEGORIES,
  BILL_RECURRENCES,
  BILL_RECURRENCE_LABELS,
} from "@/lib/constants"
import { toast } from "sonner"
import { Sparkles, Upload } from "lucide-react"

type Member = { id: string; firstName: string; lastName: string | null }
type Contract = { id: string; title: string | null; provider: string | null }

type ExtractionState = {
  extraction: {
    provider?: string | null
    category?: string | null
    invoiceNumber?: string | null
    reference?: string | null
    amount?: number | null
    currency?: string | null
    issueDate?: string | null
    dueDate?: string | null
    recurrence?: string | null
    summary?: string | null
    confidenceScore?: number | null
  }
  extractedText: string
  textExtractionMeta: unknown
  r2Key: string
  mimeType: string
  sizeBytes: number
  originalFilename: string
}

export function BillOcrUpload({
  members,
  contracts,
}: {
  members: Member[]
  contracts: Contract[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [state, setState] = useState<ExtractionState | null>(null)
  const [memberId, setMemberId] = useState<string>("")
  const [scope, setScope] = useState<"household" | "member">("household")
  const [contractId, setContractId] = useState<string>("")

  function handleUpload(formData: FormData) {
    const file = formData.get("file") as File | null
    if (!file) {
      toast.error("Sélectionnez un fichier")
      return
    }
    start(async () => {
      const res = await uploadAndExtractBillAction(formData)
      if (!res.ok) {
        toast.error(res.error || "Erreur d'extraction")
        return
      }
      setState({
        extraction: res.extraction,
        extractedText: res.extractedText,
        textExtractionMeta: res.textExtractionMeta,
        r2Key: res.r2Key,
        mimeType: res.mimeType,
        sizeBytes: res.sizeBytes,
        originalFilename: res.originalFilename,
      })
    })
  }

  function handleConfirm(formData: FormData) {
    if (!state) return
    const title = (formData.get("title") as string) || state.extraction.provider || state.originalFilename
    const provider = (formData.get("provider") as string) || state.extraction.provider || null
    const category = (formData.get("category") as string) || state.extraction.category || null
    const amount = Number.parseFloat(((formData.get("amount") as string) ?? "").replace(",", "."))
    const dueDate = (formData.get("dueDate") as string) || null
    const issueDate = (formData.get("issueDate") as string) || null
    const recurrence = (formData.get("recurrence") as string) || state.extraction.recurrence || "one_off"
    start(async () => {
      const res = await confirmBillFromExtractionAction({
        extraction: state.extraction,
        extractedText: state.extractedText,
        textExtractionMeta: state.textExtractionMeta,
        r2Key: state.r2Key,
        mimeType: state.mimeType,
        sizeBytes: state.sizeBytes,
        originalFilename: state.originalFilename,
        override: {
          title,
          provider,
          category,
          amount: Number.isFinite(amount) ? amount : state.extraction.amount ?? 0,
          dueDate: dueDate ? new Date(dueDate) : null,
          issueDate: issueDate ? new Date(issueDate) : null,
          recurrence: recurrence as never,
          memberId: scope === "member" ? memberId || null : null,
          isHouseholdWide: scope === "household",
          contractId: contractId || null,
        },
      })
      if (res.ok) {
        toast.success("Facture créée à partir de la lecture OCR")
        router.refresh()
        router.push(`/bills/${res.billId}`)
      } else {
        toast.error(res.error || "Erreur")
      }
    })
  }

  if (!state) {
    return (
      <form action={handleUpload} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Téléversez le PDF ou la photo de la facture. ContratBox lit le document et pré-remplit les champs.
        </p>
        <div>
          <Label htmlFor="bill-file">Fichier</Label>
          <Input id="bill-file" name="file" type="file" accept="application/pdf,image/*" required />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {pending ? "Lecture en cours…" : "Lire la facture"}
        </Button>
      </form>
    )
  }

  const e = state.extraction
  return (
    <form action={handleConfirm} className="space-y-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-1 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Champs détectés (modifiez si nécessaire)
          </div>
          {e.summary && <p className="text-muted-foreground">{e.summary}</p>}
          {e.confidenceScore != null && (
            <p className="text-xs text-muted-foreground">Confiance : {e.confidenceScore}%</p>
          )}
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          defaultValue={e.provider ? `Facture ${e.provider}` : state.originalFilename}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="provider">Émetteur</Label>
          <Input id="provider" name="provider" defaultValue={e.provider ?? ""} />
        </div>
        <div>
          <Label htmlFor="amount">Montant (CHF)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.05"
            defaultValue={e.amount ?? ""}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Catégorie</Label>
          <Select name="category" defaultValue={e.category ?? "other"}>
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
          <Select name="recurrence" defaultValue={e.recurrence ?? "one_off"}>
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
          <Input id="issueDate" name="issueDate" type="date" defaultValue={e.issueDate ?? ""} />
        </div>
        <div>
          <Label htmlFor="dueDate">Échéance</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={e.dueDate ?? ""} />
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
            <Select value={memberId} onValueChange={setMemberId}>
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
          <Select value={contractId || "__none__"} onValueChange={(v) => setContractId(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Aucun contrat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucun</SelectItem>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title || c.provider || c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Enregistrement…" : "Enregistrer la facture"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setState(null)}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
