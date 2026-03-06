import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Gratuit",
    price: "0",
    period: "pour toujours",
    description: "Idéal pour découvrir ContratBox",
    features: [
      "Jusqu'à 3 contrats",
      "Tableau de bord de base",
      "Rappels par email",
      "Vue budget mensuel",
    ],
    cta: "Commencer gratuitement",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "9.90",
    period: "par mois",
    description: "Pour une gestion complète de votre ménage",
    features: [
      "Contrats illimités",
      "Membres de famille illimités",
      "Assistant IA spécialisé",
      "Alertes SMS & email",
      "Résiliation via NextLetter",
      "Analyse et optimisation budget",
      "Export PDF et Excel",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 30 jours",
    href: "/signup?plan=premium",
    highlighted: true,
  },
]

export function Pricing() {
  return (
    <section id="tarifs" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Tarifs</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Simple, transparent, suisse
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            Aucun engagement, annulable en tout temps. Paiement sécurisé par carte ou TWINT.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col gap-6 transition-all ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground border-primary shadow-brand relative"
                  : "bg-card text-card-foreground border-border shadow-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-[oklch(0.56_0.15_162)] text-white text-xs font-semibold shadow-sm">
                    Recommandé
                  </span>
                </div>
              )}

              <div>
                <p className={`text-sm font-semibold uppercase tracking-widest mb-1 ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">CHF {plan.price}</span>
                  <span className={`text-sm mb-1.5 ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    / {plan.period}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.highlighted ? "bg-primary-foreground/20" : "bg-primary/10"}`}>
                      <Check className={`w-2.5 h-2.5 ${plan.highlighted ? "text-primary-foreground" : "text-primary"}`} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-auto h-11 rounded-xl font-semibold ${
                  plan.highlighted
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-brand"
                }`}
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
