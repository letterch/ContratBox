"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Receipt,
  Plus,
  Upload,
  AlertTriangle,
  Calendar,
  Users,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import {
  BILL_CATEGORIES,
  BILL_STATUS_LABELS,
  BILL_RECURRENCE_LABELS,
} from "@/lib/constants"
import type { BillRow, BillsPortfolioSummary } from "@/lib/services/bills-analytics"
import { formatChf, formatDate, statusBadgeVariant } from "./format"
import { BillManualForm } from "./bill-manual-form"
import { BillOcrUpload } from "./bill-ocr-upload"

type Member = { id: string; firstName: string; lastName: string | null }
type Contract = { id: string; title: string | null; provider: string | null }

type Props = {
  bills: BillRow[]
  summary: BillsPortfolioSummary
  members: Member[]
  contracts: Contract[]
  canAdd: boolean
  count: number
  limit: number | null
  moduleEnabled: boolean
  inboundEmail: string | null
}

export function BillsListClient({
  bills,
  summary,
  members,
  contracts,
  canAdd,
  count,
  limit,
  moduleEnabled,
  inboundEmail,
}: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [memberFilter, setMemberFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false
      if (memberFilter === "household" && !b.isHouseholdWide) return false
      if (memberFilter !== "all" && memberFilter !== "household" && b.member?.id !== memberFilter)
        return false
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [b.title, b.provider, b.categoryLabel, b.member?.firstName].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [bills, statusFilter, memberFilter, categoryFilter, search])

  const dueSoon = bills.filter(
    (b) => (b.status === "pending" || b.status === "overdue") && b.daysUntilDue != null && b.daysUntilDue <= 14
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Receipt className="h-6 w-6 text-primary" />
            Factures mensuelles
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi global des dépenses du ménage — par catégorie, par membre, échéances et historique.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {limit != null ? (
            <span>
              Quota plan : <strong>{count}</strong> / {limit}
            </span>
          ) : (
            <span>Quota illimité</span>
          )}
        </div>
      </header>

      {!moduleEnabled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-900">
              Module factures désactivé pour votre plan. Activez un abonnement pour gérer vos factures.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          label="Mensuel équivalent"
          value={formatChf(summary.monthlyEquivalentChf)}
          hint={`Annuel : ${formatChf(summary.yearlyEquivalentChf)}`}
        />
        <KpiCard
          icon={<Receipt className="h-4 w-4 text-blue-600" />}
          label="Factures en attente"
          value={String(summary.pendingCount + summary.overdueCount)}
          hint={`Montant dû : ${formatChf(summary.pendingAmountChf)}`}
        />
        <KpiCard
          icon={<Calendar className="h-4 w-4 text-orange-600" />}
          label="Échéances < 14 j"
          value={String(dueSoon.length)}
          hint={summary.overdueCount > 0 ? `${summary.overdueCount} en retard` : "Pas de retard"}
        />
        <KpiCard
          icon={<Users className="h-4 w-4 text-purple-600" />}
          label="Total factures"
          value={String(summary.total)}
          hint={`${summary.paidCount} payées`}
        />
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="add">Ajouter</TabsTrigger>
          <TabsTrigger value="analytics">Analyse</TabsTrigger>
          <TabsTrigger value="email">Email entrant</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 pt-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par titre, fournisseur, membre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(BILL_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Membre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="household">Ménage</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName}
                    {m.lastName ? ` ${m.lastName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="md:w-52">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {Object.entries(BILL_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredBills.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Receipt className="mx-auto mb-2 h-10 w-10 opacity-40" />
                {bills.length === 0
                  ? "Aucune facture pour l'instant. Ajoutez votre première facture via l'onglet « Ajouter »."
                  : "Aucune facture ne correspond à ces filtres."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {filteredBills.map((b) => (
                <BillRowCard key={b.id} bill={b} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-4 pt-4">
          {!canAdd ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-900">
                Quota gratuit atteint ({count} / {limit}). Passez à un abonnement pour ajouter plus de factures.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Plus className="h-4 w-4" />
                    Saisie manuelle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BillManualForm members={members} contracts={contracts} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-4 w-4" />
                    Lecture OCR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BillOcrUpload members={members} contracts={contracts} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dépenses mensuelles par catégorie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Pas encore de données.</p>
                ) : (
                  summary.byCategory.map((c) => {
                    const pct = summary.monthlyEquivalentChf
                      ? Math.round((c.amountMonthly / summary.monthlyEquivalentChf) * 100)
                      : 0
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>
                            {c.label} <span className="text-xs text-muted-foreground">({c.count})</span>
                          </span>
                          <strong>{formatChf(c.amountMonthly)}</strong>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Par membre du ménage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.byMember.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Pas encore de données.</p>
                ) : (
                  summary.byMember.map((m) => (
                    <div key={m.memberId ?? m.label} className="flex items-center justify-between text-sm">
                      <span>
                        {m.label} <span className="text-xs text-muted-foreground">({m.count})</span>
                      </span>
                      <strong>{formatChf(m.amountMonthly)} / mois</strong>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {summary.monthlyEquivalentChf > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-start gap-3 p-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <div className="text-sm">
                  Vos dépenses mensuelles fixes représentent{" "}
                  <strong>{formatChf(summary.monthlyEquivalentChf)}</strong>, soit{" "}
                  <strong>{formatChf(summary.yearlyEquivalentChf)} / an</strong>. Demandez à
                  l'assistant IA des pistes d'optimisation (résiliation d'assurances, abonnements doublons…).
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="email" className="space-y-3 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adresse email dédiée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {inboundEmail ? (
                <>
                  <p>
                    Faites suivre vos emails de factures à votre adresse personnelle ContratBox :
                  </p>
                  <div className="rounded-md border bg-muted p-3 font-mono text-xs">{inboundEmail}</div>
                  <p className="text-muted-foreground">
                    Les pièces jointes (PDF, JPG, PNG) seront analysées automatiquement et créeront une facture.
                    Disponible dès le déploiement de la passerelle email entrant (en cours d'activation).
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Adresse email entrante non encore activée pour ce compte. Elle sera générée automatiquement
                  lors du déploiement de la passerelle email entrant.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-xl font-semibold">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
}

function BillRowCard({ bill }: { bill: BillRow }) {
  const isOverdue =
    (bill.status === "pending" || bill.status === "overdue") &&
    bill.daysUntilDue != null &&
    bill.daysUntilDue < 0
  const isUpcoming =
    bill.status === "pending" && bill.daysUntilDue != null && bill.daysUntilDue >= 0 && bill.daysUntilDue <= 14
  return (
    <Link
      href={`/bills/${bill.id}`}
      className="flex flex-col gap-2 rounded-lg border bg-card p-3 transition hover:bg-accent md:flex-row md:items-center"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{bill.title}</span>
          {bill.categoryLabel && (
            <Badge variant="outline" className="hidden md:inline-flex">
              {bill.categoryLabel}
            </Badge>
          )}
          {bill.recurrence !== "one_off" && (
            <Badge variant="secondary" className="hidden md:inline-flex">
              {BILL_RECURRENCE_LABELS[bill.recurrence as keyof typeof BILL_RECURRENCE_LABELS] ?? bill.recurrence}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {bill.provider && <span>{bill.provider}</span>}
          {bill.member && (
            <span>
              · {bill.member.firstName}
              {bill.member.lastName ? ` ${bill.member.lastName}` : ""}
            </span>
          )}
          {bill.isHouseholdWide && <span>· Ménage</span>}
          {bill.dueDate && (
            <span>
              · Échéance : {formatDate(bill.dueDate)}
              {isOverdue && bill.daysUntilDue != null && (
                <span className="ml-1 font-medium text-destructive">(retard {Math.abs(bill.daysUntilDue)} j)</span>
              )}
              {isUpcoming && bill.daysUntilDue != null && (
                <span className="ml-1 font-medium text-orange-600">(dans {bill.daysUntilDue} j)</span>
              )}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <Badge variant={statusBadgeVariant(bill.status)}>
          {BILL_STATUS_LABELS[bill.status as keyof typeof BILL_STATUS_LABELS] ?? bill.status}
        </Badge>
        <span className="text-base font-semibold tabular-nums">{formatChf(bill.amount)}</span>
      </div>
    </Link>
  )
}
