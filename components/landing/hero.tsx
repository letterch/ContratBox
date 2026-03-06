"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Shield, Zap, Gift, Bell } from "lucide-react"

const trustBadges = [
  { icon: Shield, label: "Pensé pour la Suisse" },
  { icon: Zap, label: "Connexion sécurisée" },
  { icon: Gift, label: "Jusqu'à 3 contrats gratuits" },
  { icon: Bell, label: "Rappels intelligents" },
]

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[oklch(0.14_0.06_255)] via-[oklch(0.18_0.07_240)] to-[oklch(0.12_0.05_265)]">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Glow orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[700px] h-[500px] rounded-full opacity-20 blur-3xl bg-[oklch(0.58_0.18_220)]" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl bg-[oklch(0.56_0.15_162)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.56_0.15_162)] animate-pulse" />
            Nouveau — Assistant IA spécialisé contrats suisses
            <ArrowRight className="w-3.5 h-3.5" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight text-balance mb-6">
            Tous vos contrats
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.75_0.15_220)] to-[oklch(0.65_0.18_185)]">
              au même endroit
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10 text-pretty">
            Assurances, abonnements, hypothèques, leasing, internet, énergie — ContratBox centralise,
            explique et vous rappelle les échéances importantes.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Button
              size="lg"
              className="bg-white text-[oklch(0.18_0.07_255)] hover:bg-white/90 font-semibold shadow-elevated px-8 h-12 rounded-xl"
              asChild
            >
              <Link href="/signup">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20 px-8 h-12 rounded-xl"
              asChild
            >
              <Link href="#demo">
                <Play className="w-4 h-4 mr-2 fill-current" />
                Voir comment ça marche
              </Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 backdrop-blur-sm"
              >
                <badge.icon className="w-3.5 h-3.5 text-white/50" />
                <span className="text-white/70 text-xs font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-1 shadow-elevated">
            <div className="rounded-xl bg-[oklch(0.14_0.05_255)] overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white/8 text-white/30 text-xs">app.contratbox.ch/dashboard</div>
                </div>
              </div>
              {/* Mini dashboard preview */}
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Coût mensuel", value: "CHF 1'284", color: "text-[oklch(0.75_0.15_220)]" },
                  { label: "Coût annuel", value: "CHF 15'408", color: "text-white" },
                  { label: "Contrats actifs", value: "12", color: "text-[oklch(0.70_0.15_162)]" },
                  { label: "Alertes actives", value: "2", color: "text-[oklch(0.75_0.15_60)]" },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl bg-white/6 border border-white/8 p-4">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{card.label}</p>
                    <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { provider: "Swisscom", cat: "Télécom", amount: "CHF 89/mois", days: 14, urgent: true },
                  { provider: "AXA Assurances", cat: "Assurance ménage", amount: "CHF 124/mois", days: 45, urgent: false },
                  { provider: "Romande Énergie", cat: "Électricité", amount: "CHF 180/mois", days: 92, urgent: false },
                ].map((c) => (
                  <div key={c.provider} className="rounded-xl bg-white/5 border border-white/8 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white text-sm font-medium">{c.provider}</p>
                      <p className="text-white/40 text-xs">{c.cat}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-xs font-medium">{c.amount}</p>
                      <p className={`text-xs mt-0.5 ${c.urgent ? "text-[oklch(0.75_0.15_60)]" : "text-white/30"}`}>
                        {c.days}j restants
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
