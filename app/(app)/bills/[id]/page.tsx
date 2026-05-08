import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { requirePlanModule } from "@/lib/guards/require-access"
import { getBillForOwner } from "@/lib/services/bills"
import {
  BILL_CATEGORIES,
  BILL_STATUS_LABELS,
  BILL_RECURRENCE_LABELS,
  type BillCategorySlug,
  type BillStatus,
  type BillRecurrence,
} from "@/lib/constants"
import { formatChf, formatDate, statusBadgeVariant } from "@/components/bills/format"
import { BillDetailActions } from "@/components/bills/bill-detail-actions"

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session } = await requirePlanModule("module_bills")
  const { id } = await params
  const bill = await getBillForOwner(id, session.user.id)
  if (!bill) notFound()

  const amount = Number(bill.amount)
  const categoryLabel = bill.category
    ? BILL_CATEGORIES[bill.category as BillCategorySlug] ?? bill.category
    : null
  const recurrenceLabel = BILL_RECURRENCE_LABELS[bill.recurrence as BillRecurrence] ?? bill.recurrence
  const statusLabel = BILL_STATUS_LABELS[bill.status as BillStatus] ?? bill.status

  const dueDate = bill.dueDate ?? null
  const daysUntil = dueDate
    ? Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null
  const isOverdue = daysUntil != null && daysUntil < 0 && bill.status !== "paid" && bill.status !== "cancelled"

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bills">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{bill.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {bill.provider && <span>{bill.provider}</span>}
            {categoryLabel && <Badge variant="outline">{categoryLabel}</Badge>}
            <Badge variant={statusBadgeVariant(bill.status)}>{statusLabel}</Badge>
            <Badge variant="secondary">{recurrenceLabel}</Badge>
          </div>
        </div>
        <BillDetailActions billId={bill.id} status={bill.status} />
      </header>

      {isOverdue && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">
            Échéance dépassée de {Math.abs(daysUntil ?? 0)} j. Régularisez ou marquez comme payée.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Montant</div>
            <div className="text-2xl font-semibold">{formatChf(amount)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{bill.currency}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Échéance</div>
            <div className="text-base font-medium">{formatDate(bill.dueDate)}</div>
            {daysUntil != null && bill.status === "pending" && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {daysUntil >= 0 ? `Dans ${daysUntil} j.` : `Retard ${Math.abs(daysUntil)} j.`}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Émise le</div>
            <div className="text-base font-medium">{formatDate(bill.issueDate)}</div>
            {bill.paidAt && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                Payée le {formatDate(bill.paidAt)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="N° facture" value={bill.invoiceNumber || "—"} />
            <Row label="Référence (BVR/QR)" value={bill.reference || "—"} />
            <Row
              label="Attribution"
              value={
                bill.isHouseholdWide
                  ? "Ménage entier"
                  : bill.member
                  ? `${bill.member.firstName}${bill.member.lastName ? ` ${bill.member.lastName}` : ""}`
                  : "Non assignée"
              }
            />
            <Row
              label="Source"
              value={
                bill.source === "ocr"
                  ? "Lecture OCR"
                  : bill.source === "email"
                  ? "Email entrant"
                  : bill.source === "inbox_conversion"
                  ? "Inbox admin"
                  : "Saisie manuelle"
              }
            />
            <Row
              label="Contrat lié"
              value={
                bill.contract ? (
                  <Link href={`/contracts/${bill.contract.id}`} className="text-primary underline">
                    {bill.contract.title}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pièces jointes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bill.documents.length === 0 ? (
              <p className="text-muted-foreground">Aucune pièce jointe.</p>
            ) : (
              bill.documents.map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(d.sizeBytes / 1024).toFixed(0)} kB
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {bill.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{bill.notes}</CardContent>
        </Card>
      )}

      {bill.reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rappels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bill.reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.dueDate)} · {r.urgencyLevel}
                  </div>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
