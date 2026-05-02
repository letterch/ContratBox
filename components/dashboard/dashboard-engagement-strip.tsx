import Link from "next/link"
import { Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

/** CTA toujours visibles pour découvrir les recommandations (même sans triggers). */
export function DashboardEngagementStrip() {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3">
      <p className="text-xs text-muted-foreground sm:mr-2 sm:flex-1 min-w-0">
        Les actions prioritaires apparaissent quand une échéance ou une économie est détectée sur vos contrats.
      </p>
      <Button size="sm" className="rounded-xl h-9 text-xs gap-2 shrink-0" asChild>
        <Link href="/ai">
          <Sparkles className="w-3.5 h-3.5" />
          Analyser avec l’assistant IA
        </Link>
      </Button>
      <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs gap-2 shrink-0" asChild>
        <Link href="/upload">
          <Upload className="w-3.5 h-3.5" />
          Importer un contrat
        </Link>
      </Button>
    </div>
  )
}
