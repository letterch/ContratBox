"use client"

import Link from "next/link"
import { Send, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ContractDecisionAnalysisPayload } from "@/lib/schemas/contract-decision-analysis"

type Props = {
  contractId: string
  insight: ContractDecisionAnalysisPayload
  priorityScore: number
  nextLetterUrl: string
  onCreateReminder: () => void
}

export function DecisionInsightCard({ contractId, insight, priorityScore, nextLetterUrl, onCreateReminder }: Props) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Analyse décisionnelle</p>
        <span className="text-[10px] text-muted-foreground">Priorité {priorityScore}/100</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">Impact estimé / an</p>
          <p className="font-semibold text-[oklch(0.56_0.15_162)]">
            CHF {Math.round(insight.estimatedImpactChfYear).toLocaleString("fr-CH")}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Risque · urgence</p>
          <p className="font-medium text-foreground">
            {insight.riskLevel} · {insight.urgencyLevel}
          </p>
        </div>
      </div>
      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{insight.nextAction}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {(insight.canCancelNow || insight.signals.cancellationDeadlineFound) && (
          <Button size="sm" className="rounded-xl h-8 text-xs gap-1.5" asChild>
            <a href={nextLetterUrl} target="_blank" rel="noopener noreferrer">
              <Send className="w-3.5 h-3.5" />
              NextLetter — résiliation
            </a>
          </Button>
        )}
        {(insight.signals.renewalDateFound || insight.signals.cancellationDeadlineFound) && (
          <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1.5" onClick={onCreateReminder}>
            <Bell className="w-3.5 h-3.5" />
            Créer un rappel
          </Button>
        )}
        <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs" asChild>
          <Link href={`/contracts/${contractId}`}>Fiche contrat</Link>
        </Button>
      </div>
      {(insight.signals.hiddenRisks.length > 0 || insight.signals.overpricingSignals.length > 0) && (
        <div className="text-[10px] text-muted-foreground space-y-1 border-t border-border/60 pt-2">
          {insight.signals.hiddenRisks.length > 0 && (
            <p>
              <span className="font-medium text-foreground">Indices risques :</span> {insight.signals.hiddenRisks.join(" · ")}
            </p>
          )}
          {insight.signals.overpricingSignals.length > 0 && (
            <p>
              <span className="font-medium text-foreground">Surcoût (texte) :</span> {insight.signals.overpricingSignals.join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
