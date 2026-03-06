"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    q: "Mes documents sont-ils en sécurité ?",
    a: "Vos documents sont hébergés en Suisse sur des serveurs chiffrés (AES-256). Nous sommes conformes au RGPD et à la LPD suisse. Vos données ne sont jamais vendues ni partagées.",
  },
  {
    q: "Quels types de contrats puis-je gérer ?",
    a: "ContratBox supporte tous les contrats ménagers : assurances (vie, ménage, RC, LAA, LCA), télécom, hypothèques, leasing, électricité, abonnements streaming, contrats de bail, et bien plus.",
  },
  {
    q: "Comment fonctionne l'extraction automatique ?",
    a: "Notre IA analyse vos PDFs et images pour en extraire les informations clés : prestataire, montant, dates d'échéance, conditions de résiliation. Vous pouvez ensuite corriger ou compléter les données.",
  },
  {
    q: "Puis-je partager l'accès avec mon/ma partenaire ?",
    a: "Oui, le plan Premium permet d'inviter des membres de votre ménage. Chacun peut accéder aux contrats partagés selon les droits que vous définissez.",
  },
  {
    q: "Comment fonctionne la résiliation via NextLetter ?",
    a: "En un clic, ContratBox rédige et envoie une lettre de résiliation conforme au droit suisse, avec accusé de réception, directement à votre prestataire via NextLetter.",
  },
  {
    q: "Y a-t-il un engagement de durée ?",
    a: "Non. Le plan Premium est mensuel et annulable en tout temps. Vous exportez vos données à tout moment au format PDF ou Excel.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Questions fréquentes
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <button
              key={i}
              className="w-full bg-card border border-border rounded-2xl px-6 py-5 text-left hover:border-primary/30 transition-all shadow-card"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-foreground text-sm sm:text-base">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                    open === i && "rotate-180"
                  )}
                />
              </div>
              {open === i && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                  {faq.a}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
