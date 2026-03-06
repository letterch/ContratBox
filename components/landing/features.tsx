import { Home, Users, Clock, PieChart, MessageSquare, Send } from "lucide-react"

const features = [
  {
    icon: Home,
    title: "Vue globale du ménage",
    description: "Tous vos contrats familiaux sur un seul tableau de bord. Coûts mensuels, annuels, par catégorie.",
    accent: "bg-primary/8 text-primary",
  },
  {
    icon: Users,
    title: "Contrats par membre",
    description: "Attribuez chaque contrat à un membre de la famille. Filtrez, comparez, analysez.",
    accent: "bg-[oklch(0.56_0.15_162)]/8 text-[oklch(0.56_0.15_162)]",
  },
  {
    icon: Clock,
    title: "Délais de résiliation",
    description: "Ne ratez plus jamais une fenêtre de résiliation. Alertes intelligentes avant chaque échéance.",
    accent: "bg-[oklch(0.70_0.15_60)]/8 text-[oklch(0.70_0.15_60)]",
  },
  {
    icon: PieChart,
    title: "Vue budget mensuel/annuel",
    description: "Visualisez vos engagements financiers récurrents. Identifiez les optimisations potentielles.",
    accent: "bg-[oklch(0.58_0.18_220)]/8 text-[oklch(0.58_0.18_220)]",
  },
  {
    icon: MessageSquare,
    title: "Assistant IA spécialisé",
    description: "Posez n'importe quelle question sur vos contrats. L'IA connaît le droit suisse des contrats.",
    accent: "bg-primary/8 text-primary",
  },
  {
    icon: Send,
    title: "Résiliation via NextLetter",
    description: "Résilier un contrat en un clic. Lettre rédigée, adressée et envoyée automatiquement.",
    accent: "bg-[oklch(0.57_0.20_25)]/8 text-[oklch(0.57_0.20_25)]",
  },
]

export function Features() {
  return (
    <section id="fonctionnalites" className="py-24 bg-muted/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Fonctionnalités</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Tout ce dont votre ménage a besoin
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <div className={`w-11 h-11 rounded-xl ${f.accent} flex items-center justify-center mb-4`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
