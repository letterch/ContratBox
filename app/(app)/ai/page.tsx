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

type Message = {
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

type ContractItem = {
  id: string
  name: string
  category?: string | null
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Bonjour ! Je suis votre assistant ContratBox, spécialisé en contrats et droit suisse des assurances.\n\nJe peux analyser vos contrats, répondre à vos questions sur les délais de résiliation, les couvertures, les clauses importantes, et bien plus. Comment puis-je vous aider aujourd'hui ?",
    sources: [],
  },
]

function getContractVisual(category?: string | null) {
  const key = (category ?? "").toLowerCase()
  if (key.includes("health") || key.includes("insurance")) return { icon: Shield, color: "text-primary", bg: "bg-primary/8" }
  if (key.includes("telecom") || key.includes("internet")) return { icon: Wifi, color: "text-[oklch(0.58_0.18_220)]", bg: "bg-[oklch(0.58_0.18_220)]/8" }
  if (key.includes("mortgage") || key.includes("home")) return { icon: Home, color: "text-[oklch(0.56_0.15_162)]", bg: "bg-[oklch(0.56_0.15_162)]/8" }
  if (key.includes("car") || key.includes("leasing")) return { icon: Car, color: "text-[oklch(0.70_0.15_60)]", bg: "bg-[oklch(0.70_0.15_60)]/8" }
  return { icon: Zap, color: "text-[oklch(0.55_0.12_295)]", bg: "bg-[oklch(0.55_0.12_295)]/8" }
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [activeContract, setActiveContract] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    fetch("/api/ai/contracts")
      .then((r) => r.json())
      .then((data) => setContracts(Array.isArray(data?.contracts) ? data.contracts : []))
      .catch(() => setContracts([]))
  }, [])

  const send = async (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, activeContractId: activeContract }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Erreur IA")
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: String(data.answer ?? "Je n'ai pas pu répondre à cette question."),
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Je n'ai pas pu générer une réponse pour le moment. Réessayez dans quelques secondes, ou reformulez votre question avec le nom du contrat concerné.",
          sources: [],
        },
      ])
    } finally {
      setLoading(false)
    }
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
            {contracts.map((c) => {
              const visual = getContractVisual(c.category)
              return (
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
                  <div className={`w-6 h-6 rounded-lg ${visual.bg} flex items-center justify-center flex-shrink-0`}>
                    <visual.icon className={`w-3 h-3 ${visual.color}`} />
                  </div>
                  {c.name}
                </button>
              )
            })}
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
                    <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
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
