/**
 * Extraction IA dédiée aux documents d’inbox administrative (hors contrats).
 * Prompt séparé du pipeline contrats pour limiter le risque de mélange des champs.
 */

import type { InboxClassification, InboxUrgency } from "@/lib/types/administrative-inbox"
import { INBOX_CLASSIFICATIONS, INBOX_URGENCIES } from "@/lib/types/administrative-inbox"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet"
const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 30000)

export type ExtractedInboxDocument = {
  classification?: InboxClassification | null
  summary?: string | null
  urgency?: InboxUrgency | null
  dueDate?: string | null
  recommendedAction?: string | null
  suggestedTaskTitle?: string | null
  confidenceScore?: number | null
}

function buildInboxPrompt(text: string): string {
  const classes = INBOX_CLASSIFICATIONS.join(" | ")
  const urgencies = INBOX_URGENCIES.join(" | ")
  return `Tu analyses un document administratif suisse (facture, courrier, rappel, impôt, assurance, bail, banque, santé, abonnement, etc.).

Réponds UNIQUEMENT en JSON valide, sans markdown, clés exactes :
- classification (string, une des valeurs: ${classes})
- summary (string court, 2-4 phrases en français)
- urgency (string: ${urgencies})
- dueDate (string ISO YYYY-MM-DD ou null si aucune échéance claire)
- recommendedAction (string, action concrète suggérée pour l’usager)
- suggestedTaskTitle (string, titre court pour une tâche TODO)
- confidenceScore (number 0-100)

Texte du document :
---
${text.slice(0, 12000)}
---

Règles :
- Ne pas inventer de date : null si incertain.
- urgency "critical" seulement si retard, mise en demeure, coupure de service, ou délai < 7 jours.
- Réponds uniquement avec le JSON.`
}

function parseJson(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw) as Record<string, unknown>
}

function normalizeDate(value: unknown): string | null {
  if (value == null || typeof value !== "string") return null
  const v = value.trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const eu = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (eu) return `${eu[3]}-${eu[2].padStart(2, "0")}-${eu[1].padStart(2, "0")}`
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function normalizeClassification(value: unknown): InboxClassification | null {
  if (typeof value !== "string") return null
  const v = value.toLowerCase().trim()
  return (INBOX_CLASSIFICATIONS as readonly string[]).includes(v) ? (v as InboxClassification) : "other"
}

function normalizeUrgency(value: unknown): InboxUrgency | null {
  if (typeof value !== "string") return null
  const v = value.toLowerCase().trim()
  return (INBOX_URGENCIES as readonly string[]).includes(v) ? (v as InboxUrgency) : "medium"
}

export async function extractAdministrativeDocument(text: string): Promise<ExtractedInboxDocument> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn("[inbox-extraction] OPENROUTER_API_KEY manquant")
    return {
      classification: "other",
      summary: text ? text.slice(0, 500) : null,
      urgency: "medium",
      recommendedAction: "Vérifier le document et classer manuellement.",
      suggestedTaskTitle: "Traiter le document reçu",
      confidenceScore: 10,
    }
  }
  let lastError: unknown = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: buildInboxPrompt(text || "(vide)") }],
          max_tokens: 1200,
        }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error("Réponse vide")
      const parsed = parseJson(content)
      return {
        classification: normalizeClassification(parsed.classification),
        summary: typeof parsed.summary === "string" ? parsed.summary : null,
        urgency: normalizeUrgency(parsed.urgency),
        dueDate: normalizeDate(parsed.dueDate),
        recommendedAction: typeof parsed.recommendedAction === "string" ? parsed.recommendedAction : null,
        suggestedTaskTitle: typeof parsed.suggestedTaskTitle === "string" ? parsed.suggestedTaskTitle : null,
        confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : null,
      }
    } catch (e) {
      lastError = e
      if (attempt < 2) await new Promise((r) => setTimeout(r, 800))
    } finally {
      clearTimeout(timeout)
    }
  }
  console.error("[inbox-extraction]", lastError)
  return {
    classification: "other",
    summary: text ? text.slice(0, 400) : null,
    urgency: "medium",
    recommendedAction: "Analyse automatique indisponible — relecture manuelle.",
    suggestedTaskTitle: "Traiter le document",
    confidenceScore: 0,
  }
}
