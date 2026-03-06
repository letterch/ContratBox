"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Sparkles, Send, Shield, Wifi, Home, Car, Zap, ChevronRight, User, Bot } from "lucide-react"

const suggestions = [
  "Quel contrat puis-je résilier ce mois?",
  "Combien je paie pour mes assurances?",
  "Mon hypothèque UBS se renouvelle quand?",
  "Explique-moi la clause de résiliation Swisscom",
]

const contracts = [
  { id: 1, name: "AXA Assurances", icon: Shield, color: "text-primary", bg: "bg-primary/8" },
  { id: 2, name: "Swisscom Fibre", icon: Wifi, color: "text-[oklch(0.58_0.18_220)]", bg: "bg-[oklch(0.58_0.18_220)]/8" },
  { id: 3, name: "UBS Hypothèque", icon: Home, color: "text-[oklch(0.56_0.15_162)]", bg: "bg-[oklch(0.56_0.15_162)]/8" },
  { id: 4, name: "LCA Leasing", icon: Car, color: "text-[oklch(0.70_0.15_60)]", bg: "bg-[oklch(0.70_0.15_60)]/8" },
  { id: 5, name: "Romande Énergie", icon: Zap, color: "text-[oklch(0.55_0.12_295)]", bg: "bg-[oklch(0.55_0.12_295)]/8" },
]

type Message = {
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Bonjour ! Je suis votre assistant ContratBox, spécialisé en contrats et droit suisse des assurances.\n\nJe peux analyser vos contrats, répondre à vos questions sur les délais de résiliation, les couvertures, les clauses importantes, et bien plus. Comment puis-je vous aider aujourd'hui ?",
    sources: [],
  },
]

function simulateResponse(question: string): Message {
  const lower = question.toLowerCase()
  if (lower.includes("résili") || lower.includes("swisscom")) {
    return {
      role: "assistant",
      content: "D'après votre contrat Swisscom Fibre (N° SW-2021-038492) :\n\n**Délai de résiliation : 30 jours** avant la date de renouvellement.\n\nVotre prochaine date de renouvellement est le **15 mars 2025**. Cela signifie que le dernier délai pour résilier est le **13 février 2025**, soit dans **14 jours**.\n\nSi vous souhaitez résilier, je vous recommande d'agir immédiatement via NextLetter pour un envoi recommandé avec accusé de réception.",
      sources: ["Swisscom Fibre — Art. 7.2 Résiliation", "Conditions Générales Swisscom 2023"],
    }
  }
  if (lower.includes("assurance") || lower.includes("combien")) {
    return {
      role: "assistant",
      content: "Voici un résumé de vos dépenses en assurances :\n\n- **AXA Assurances ménage** (Marc) : CHF 124/mois\n- **CSS LaMal** (Marc) : CHF 380/mois\n- **Total assurances** : **CHF 504/mois** soit CHF 6'048/an\n\nC'est 39% de vos dépenses contractuelles mensuelles totales (CHF 1'284). En Suisse, la moyenne est de 32% pour un ménage similaire.",
      sources: ["AXA Assurances — Contrat 2024", "CSS Assurance — Polices Marc Dupont"],
    }
  }
  return {
    role: "assistant",
    content: "Excellente question ! Je peux vous aider avec toutes les questions relatives à vos contrats. Pourriez-vous me préciser quel contrat vous intéresse, ou si vous avez une question générale sur les assurances ou le droit suisse des contrats ?",
    sources: [],
  }
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeContract, setActiveContract] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    setTimeout(() => {
      setMessages((prev) => [...prev, simulateResponse(text)])
      setLoading(false)
    }, 1200)
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-background overflow-hidden">
      {/* Left sidebar */}
      <div className="hidden lg:flex flex-col w-72 border-r border-border bg-card/50 overflow-y-auto">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Assistant IA</p>
              <p className="text-[10px] text-muted-foreground">Spécialiste contrats suisses</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Vos contrats</p>
          <div className="flex flex-col gap-1">
            {contracts.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveContract(activeContract === c.id ? null : c.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                  activeContract === c.id
                    ? "bg-primary/8 border border-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <div className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                  <c.icon className={`w-3 h-3 ${c.color}`} />
                </div>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {activeContract && (
          <div className="mx-4 p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
            Contrat sélectionné. L'IA répondra en priorité sur ce contrat.
          </div>
        )}

        <div className="p-4 mt-auto">
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
            <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              Modèle IA
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              ContratBox AI — Spécialisé droit suisse des assurances et contrats ménagers.
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat header */}
        <div className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Assistant ContratBox</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.56_0.15_162)] animate-pulse" />
                <p className="text-[10px] text-muted-foreground">En ligne</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 mb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-3 py-1.5 rounded-full bg-muted border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                msg.role === "user" ? "bg-primary" : "bg-primary/10"
              )}>
                {msg.role === "user"
                  ? <User className="w-4 h-4 text-primary-foreground" />
                  : <Bot className="w-4 h-4 text-primary" />
                }
              </div>
              <div className={cn("max-w-[80%] flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}>
                <div className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-foreground rounded-tl-sm shadow-card"
                )}>
                  {msg.content.split("\n").map((line, j) => (
                    <p key={j} className={j > 0 ? "mt-2" : ""} dangerouslySetInnerHTML={{
                      __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    }} />
                  ))}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-full bg-primary/6 border border-primary/15 text-[10px] text-primary font-medium flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary" />
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 sm:px-6 py-4 bg-background/80 backdrop-blur-xl mb-16 lg:mb-0">
          <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question sur vos contrats..."
              className="flex-1 rounded-xl h-11 bg-card border-border"
            />
            <Button type="submit" disabled={!input.trim() || loading} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground shadow-brand">
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
            L'IA peut faire des erreurs. Vérifiez toujours les informations importantes dans vos documents originaux.
          </p>
        </div>
      </div>
    </div>
  )
}
