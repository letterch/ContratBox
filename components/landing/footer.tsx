import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-[oklch(0.10_0.04_255)] text-white/60 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <span className="text-white font-bold text-sm font-mono">CB</span>
              </div>
              <span className="text-white font-semibold">ContratBox</span>
            </div>
            <p className="text-sm leading-relaxed text-white/50">
              La solution suisse de gestion des contrats ménagers. Sécurisé, simple, intelligent.
            </p>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Produit</h4>
            <ul className="space-y-2.5">
              {["Fonctionnalités", "Tarifs", "Sécurité", "Mises à jour"].map((l) => (
                <li key={l}><Link href="#" className="text-sm hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2.5">
              {["À propos", "Blog", "Presse", "Contact"].map((l) => (
                <li key={l}><Link href="#" className="text-sm hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Légal</h4>
            <ul className="space-y-2.5">
              {["Conditions d'utilisation", "Politique de confidentialité", "Mentions légales"].map((l) => (
                <li key={l}><Link href="#" className="text-sm hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © 2025 ContratBox SA, Genève, Suisse. Tous droits réservés.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.56_0.15_162)]" />
            <span className="text-xs text-white/40">Hébergé en Suisse · Conforme LPD</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
