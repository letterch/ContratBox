"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Send,
  Shield,
  Wifi,
  Home,
  Car,
  Zap,
  User,
  Bot,
  Upload,
  Trash2,
  Loader2,
  FileText,
} from "lucide-react"
import { MULTILINGUAL_SUMMARY_PROMPT } from "@/lib/services/ai-chat-language"

const suggestions = [
  "Quel contrat puis-je résilier ce mois?",
  "Combien je paie pour mes assurances?",
  "Mon hypothèque UBS se renouvelle quand?",
  "Explique-moi la clause de résiliation Swisscom",
  "Que couvrent les documents importés ? Quelles exclusions principales ?",
  "Résumé multilingue (FR · IT · EN · DE · PT · ES · TR · SQ)",
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

type AiAttachmentItem = {
  id: string
  label: string
  mimeType: string
  kind: string
  createdAt: string
  excerpt: string
  charCount: number
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Bonjour ! Je suis votre assistant ContratBox, spécialisé en contrats et droit suisse des assurances.\n\nJe peux répondre à partir de vos contrats enregistrés et aussi analyser des fichiers que vous importez ici (offres d’assurance, projets de police, scans). Posez des questions précises sur les couvertures ou demandez un résumé multilingue (FR, IT, EN, DE, PT, ES, TR, albanais). Comment puis-je vous aider ?",
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

async function fetchAiAttachments(): Promise<AiAttachmentItem[]> {
  const r = await fetch("/api/ai/attachments")
  const data = await r.json()
  return Array.isArray(data?.attachments) ? data.attachments : []
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [attachments, setAttachments] = useState<AiAttachmentItem[]>([])
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([])
  const [uploadKind, setUploadKind] = useState<"proposal" | "policy" | "other">("proposal")
  const [uploading, setUploading] = useState(false)
  const [activeContract, setActiveContract] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    fetch("/api/ai/contracts")
      .then((r) => r.json())
      .then((data) => setContracts(Array.isArray(data?.contracts) ? data.contracts : []))
      .catch(() => setContracts([]))
  }, [])

  useEffect(() => {
    fetchAiAttachments().then(setAttachments).catch(() => setAttachments([]))
  }, [])

  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const deleteAttachment = async (id: string) => {
    const res = await fetch(`/api/ai/attachments?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    if (!res.ok) return
    setAttachments((prev) => prev.filter((a) => a.id !== id))
    setSelectedAttachmentIds((prev) => prev.filter((x) => x !== id))
  }

  const onPickFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || uploading) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set("file", file)
      fd.set("kind", uploadKind)
      const res = await fetch("/api/ai/attachments", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "Échec import")
      }
      const list = await fetchAiAttachments()
      setAttachments(list)
      const nid = data?.attachment?.id as string | undefined
      if (nid) setSelectedAttachmentIds((prev) => [...prev, nid])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Import impossible pour le moment.",
          sources: [],
        },
      ])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const multilingualShortcut = trimmed === suggestions[suggestions.length - 1]
    const resolvedMessage = multilingualShortcut ? MULTILINGUAL_SUMMARY_PROMPT : trimmed
    if (multilingualShortcut && selectedAttachmentIds.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Pour un résumé multilingue, importez d’abord un PDF ou une image (offre ou police), puis cochez-la dans « Imports pour l’analyse » et renvoyez la même demande.",
          sources: [],
        },
      ])
      return
    }

    const userMsg: Message = { role: "user", content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: resolvedMessage,
          activeContractId: activeContract,
          attachmentIds: selectedAttachmentIds.length ? selectedAttachmentIds : undefined,
        }),
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
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf"
        className="sr-only"
        aria-hidden
        onChange={(e) => onPickFile(e.target.files)}
      />

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

        <div className="p-4 border-b border-border space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Importer une offre ou un contrat</p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            PDF ou image : extraction du texte pour analyse et résumés multilingues. Les fichiers importés restent dans cet assistant (pas ajoutés automatiquement à « Mes contrats »).
          </p>
          <select
            value={uploadKind}
            onChange={(e) => setUploadKind(e.target.value as "proposal" | "policy" | "other")}
            className="w-full rounded-xl border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="proposal">Offre / proposition assurance</option>
            <option value="policy">Police ou titre contractuel</option>
            <option value="other">Autre document</option>
          </select>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-2 h-9 text-xs"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Extraction du texte…" : "Choisir un fichier"}
          </Button>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-1">Imports pour l’analyse</p>
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-0.5">
            {attachments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">Aucun fichier importé pour le moment.</p>
            ) : (
              attachments.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-2 py-2 text-left text-xs",
                    selectedAttachmentIds.includes(a.id) ? "border-primary/40 bg-primary/5" : "border-border/60"
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={selectedAttachmentIds.includes(a.id)}
                    onClick={() => toggleAttachment(a.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border bg-background flex items-center justify-center"
                  >
                    {selectedAttachmentIds.includes(a.id) ? <span className="h-2 w-2 rounded-sm bg-primary" /> : null}
                  </button>
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => toggleAttachment(a.id)}>
                    <span className="flex items-center gap-1 font-medium text-foreground truncate">
                      <FileText className="w-3 h-3 shrink-0 opacity-70" />
                      {a.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">{a.excerpt}</span>
                  </button>
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteAttachment(a.id)}
                    aria-label="Supprimer l’import"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
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

        {(activeContract || selectedAttachmentIds.length > 0) && (
          <div className="mx-4 p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
            {activeContract ? <p>Contrat sélectionné : l’IA priorise ce contrat dans sa réponse.</p> : null}
            {selectedAttachmentIds.length > 0 ? (
              <p>{selectedAttachmentIds.length} fichier(s) importé(s) inclus dans la prochaine question.</p>
            ) : null}
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

        <div className="lg:hidden flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-muted/25">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl h-8 text-xs gap-1"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Importer
          </Button>
          <select
            value={uploadKind}
            onChange={(e) => setUploadKind(e.target.value as "proposal" | "policy" | "other")}
            className="rounded-lg border border-border bg-background px-2 py-1 text-[11px]"
          >
            <option value="proposal">Offre</option>
            <option value="policy">Police</option>
            <option value="other">Autre</option>
          </select>
          <span className="text-[10px] text-muted-foreground">{selectedAttachmentIds.length} fichier(s) coché(s)</span>
        </div>

        {attachments.length > 0 ? (
          <div className="lg:hidden px-3 py-2 overflow-x-auto flex gap-2 border-b border-border bg-background/90">
            {attachments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAttachment(a.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] max-w-[220px] truncate transition-colors",
                  selectedAttachmentIds.includes(a.id)
                    ? "border-primary bg-primary/12 text-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}

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
