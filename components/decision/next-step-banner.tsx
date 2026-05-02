import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import type { NextStepBannerPayload } from "@/lib/services/recommendation-engine"

export function NextStepBanner({ payload }: { payload: NextStepBannerPayload }) {
  if (!payload) return null

  return (
    <div className="border-b border-border/80 bg-gradient-to-r from-[oklch(0.22_0.08_255)]/90 to-[oklch(0.20_0.06_280)]/90 px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-lg bg-[oklch(0.58_0.18_220)]/20 p-2 shrink-0">
            <Sparkles className="w-4 h-4 text-[oklch(0.72_0.16_220)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Prochaine étape · économies</p>
            <p className="text-sm font-semibold text-white truncate">{payload.title}</p>
            <p className="text-xs text-white/65 line-clamp-2">{payload.subtitle}</p>
            {payload.impactChfYear > 0 && (
              <p className="text-xs font-medium text-[oklch(0.78_0.14_145)] mt-1">
                Potentiel jusqu’à CHF {Math.round(payload.impactChfYear).toLocaleString("fr-CH")} / an
              </p>
            )}
          </div>
        </div>
        <Link
          href={payload.ctaHref}
          target={payload.ctaHref.startsWith("http") ? "_blank" : undefined}
          rel={payload.ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[oklch(0.22_0.08_255)] px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/95 transition-colors shrink-0"
        >
          {payload.ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
