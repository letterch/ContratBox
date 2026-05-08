/**
 * Extraction IA dédiée aux factures (suisse). Distincte de l'extraction inbox
 * et contrats : on cherche montant, échéance, émetteur, BVR/QR, période.
 */

import {
  buildOpenRouterChatCompletionBody,
  OPENROUTER_CHAT_COMPLETIONS_URL,
} from "@/lib/services/openrouter-models"
import { BILL_CATEGORY_SLUGS } from "@/lib/constants"

const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 60000)

export type ExtractedBill = {
  /** Émetteur (Swisscom, Romande Énergie, CSS…). */
  provider?: string | null
  /** Catégorie inférée parmi BILL_CATEGORY_SLUGS. */
  category?: string | null
  /** Numéro de facture / Rechnungsnummer. */
  invoiceNumber?: string | null
  /** Référence BVR ou QR-bill. */
  reference?: string | null
  amount?: number | null
  currency?: string | null
  issueDate?: string | null
  dueDate?: string | null
  /** Récurrence supposée : monthly | quarterly | annual | one_off. */
  recurrence?: string | null
  /** Bref résumé en français pour l'UI. */
  summary?: string | null
  /** Score de confiance 0..100. */
  confidenceScore?: number | null
}

function buildBillPrompt(text: string): string {
  const cats = BILL_CATEGORY_SLUGS.join(" | ")
  return `Tu analyses une facture suisse (BVR/QR-bill, facture mensuelle, prime, abonnement, etc.).

Réponds UNIQUEMENT en JSON valide, sans markdown, clés exactes :
- provider (string : émetteur de la facture, ex "Swisscom", "Romande Energie")
- category (string parmi: ${cats})
- invoiceNumber (string ou null)
- reference (string : référence BVR / QR / IBAN, ou null)
- amount (number en CHF, ou null si non trouvé)
- currency (string ISO 3 lettres, par défaut "CHF")
- issueDate (string ISO YYYY-MM-DD ou null)
- dueDate (string ISO YYYY-MM-DD ou null)
- recurrence (string: monthly | quarterly | annual | one_off)
- summary (string FR court 1-2 phrases)
- confidenceScore (number 0-100)

Texte de la facture :
---
${text.slice(0, 12000)}
---

Règles :
- Ne pas inventer de date / montant : null si incertain.
- amount = montant total à payer (TTC), pas un sous-total.
- Si périodicité non indiquée, retourner "one_off".
- Pour les primes maladie, électricité, télécom, internet : recurrence "monthly" si pas indiqué autrement.
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
  const eu = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (eu) return `${eu[3]}-${eu[2].padStart(2, "0")}-${eu[1].padStart(2, "0")}`
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const cleaned = value
      .replace(/[^0-9,\\.\\-]/g, "")
      .replace(/,/g, ".")
      .trim()
    const n = Number.parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function normalizeCategory(value: unknown): string | null {
  if (typeof value !== "string") return null
  const v = value.toLowerCase().trim()
  return (BILL_CATEGORY_SLUGS as readonly string[]).includes(v) ? v : "other"
}

function normalizeRecurrence(value: unknown): string | null {
  if (typeof value !== "string") return null
  const v = value.toLowerCase().trim()
  const allowed = ["one_off", "monthly", "quarterly", "annual"]
  return allowed.includes(v) ? v : "one_off"
}

export async function extractBillData(text: string): Promise<ExtractedBill> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey || !text || !text.trim()) {
    return {
      provider: null,
      category: "other",
      summary: text ? text.slice(0, 280) : null,
      recurrence: "one_off",
      confidenceScore: 0,
    }
  }
  let lastError: unknown = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer":
            process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
          "X-Title": "ContratBox bill extraction",
        },
        body: JSON.stringify(
          buildOpenRouterChatCompletionBody({
            messages: [{ role: "user", content: buildBillPrompt(text) }],
            max_tokens: 1200,
            temperature: 0,
          })
        ),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error("Réponse vide")
      const parsed = parseJson(content)
      return {
        provider: typeof parsed.provider === "string" ? parsed.provider : null,
        category: normalizeCategory(parsed.category),
        invoiceNumber:
          typeof parsed.invoiceNumber === "string" ? parsed.invoiceNumber : null,
        reference: typeof parsed.reference === "string" ? parsed.reference : null,
        amount: normalizeAmount(parsed.amount),
        currency:
          typeof parsed.currency === "string" && parsed.currency.length >= 3
            ? parsed.currency.slice(0, 3).toUpperCase()
            : "CHF",
        issueDate: normalizeDate(parsed.issueDate),
        dueDate: normalizeDate(parsed.dueDate),
        recurrence: normalizeRecurrence(parsed.recurrence),
        summary: typeof parsed.summary === "string" ? parsed.summary : null,
        confidenceScore:
          typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : null,
      }
    } catch (e) {
      lastError = e
      if (attempt < 2) await new Promise((r) => setTimeout(r, 800))
    } finally {
      clearTimeout(timeout)
    }
  }
  console.error("[bill-extraction]", lastError)
  return {
    provider: null,
    category: "other",
    summary: text ? text.slice(0, 280) : null,
    recurrence: "one_off",
    confidenceScore: 0,
  }
}
