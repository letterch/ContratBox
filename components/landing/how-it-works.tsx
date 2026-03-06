import { Upload, Lightbulb, Zap } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Importez vos contrats",
    description:
      "Glissez-déposez vos PDFs ou photos de documents. Notre IA extrait automatiquement toutes les informations importantes.",
  },
  {
    number: "02",
    icon: Lightbulb,
    title: "Comprenez ce qu'ils contiennent",
    description:
      "Posez des questions à notre assistant IA spécialisé. Obtenez des résumés clairs, des points d'attention et des comparaisons.",
  },
  {
    number: "03",
    icon: Zap,
    title: "Agissez au bon moment",
    description:
      "Recevez des alertes proactives avant chaque échéance. Résiliez en un clic via NextLetter ou renouvelez en connaissance de cause.",
  },
]

export function HowItWorks() {
  return (
    <section id="demo" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Comment ça marche</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Trois étapes, zéro stress
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-pretty leading-relaxed">
            ContratBox transforme votre pile de documents en centre de contrôle intelligent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center gap-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center shadow-card">
                  <step.icon className="w-9 h-9 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-brand">
                  {i + 1}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary/60 tracking-[0.2em] uppercase mb-1">{step.number}</p>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
