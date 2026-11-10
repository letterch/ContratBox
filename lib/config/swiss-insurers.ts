/**
 * Lexicon assureurs / opérateurs suisses pour OCR et extraction.
 * Aide à normaliser le provider même si le PDF est mal scanné.
 */

export type SwissProviderEntry = {
  canonical: string
  aliases: string[]
  categories: string[]
}

/** Ordre : aliases longs / spécifiques d'abord via scoring (longueur + position). */
export const SWISS_PROVIDERS: SwissProviderEntry[] = [
  { canonical: "Mobilière", aliases: ["la mobiliere", "die mobiliar", "mobiliere", "mobiliare"], categories: ["household_insurance", "personal_liability", "car_insurance", "legal_protection"] },
  { canonical: "Helvetia", aliases: ["helvetia assurances", "helvetia"], categories: ["household_insurance", "personal_liability", "life_insurance"] },
  { canonical: "AXA", aliases: ["axa winterthur", "axa-aragon", "axa"], categories: ["household_insurance", "personal_liability", "car_insurance", "life_insurance"] },
  { canonical: "Zurich", aliases: ["zurich assurances", "zurich insurance", "zurich"], categories: ["household_insurance", "personal_liability", "car_insurance"] },
  { canonical: "Bâloise", aliases: ["baloise", "basler"], categories: ["household_insurance", "personal_liability", "life_insurance"] },
  { canonical: "Generali", aliases: ["generali suisse", "generali"], categories: ["household_insurance", "life_insurance"] },
  { canonical: "Vaudoise", aliases: ["vaudoise assurances", "vaudoise"], categories: ["household_insurance", "personal_liability", "car_insurance"] },
  { canonical: "CSS", aliases: ["css assurance", "css"], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Helsana", aliases: ["helsana"], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Swica", aliases: ["swica"], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Groupe Mutuel", aliases: ["groupe mutuel"], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Assura", aliases: ["assura sa", "assura.ch", "assura."], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Concordia", aliases: ["concordia"], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Visana", aliases: ["visana"], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Sanitas", aliases: ["sanitas"], categories: ["health_basic", "health_supplementary"] },
  { canonical: "Swisscom", aliases: ["swisscom"], categories: ["telecom_mobile", "telecom_internet"] },
  { canonical: "Sunrise", aliases: ["upc sunrise", "sunrise"], categories: ["telecom_mobile", "telecom_internet"] },
  { canonical: "Salt", aliases: ["salt"], categories: ["telecom_mobile"] },
  { canonical: "Romande Énergie", aliases: ["romande energie", "romande énergie"], categories: ["utilities_electricity"] },
  { canonical: "ECA", aliases: ["etablissement cantonal d'assurance", "établissement cantonal", "eca"], categories: ["other"] },
  { canonical: "TCS", aliases: ["touring club suisse", "tcs"], categories: ["car_insurance", "legal_protection"] },
  { canonical: "DAS", aliases: ["das protection juridique", "das"], categories: ["legal_protection"] },
  { canonical: "CAP", aliases: ["cap protection juridique"], categories: ["legal_protection"] },
]

function normalizeForMatch(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Match alias avec frontières de mots (évite de matcher "cap" dans "capital"). */
function findAliasIndex(haystack: string, alias: string): number {
  const a = normalizeForMatch(alias)
  if (!a) return -1
  // Alias se terminant par "." (assura.) : match littéral
  if (a.endsWith(".")) {
    return haystack.indexOf(a)
  }
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(a)}(?:$|[^a-z0-9])`, "i")
  const m = haystack.match(re)
  if (!m || m.index == null) return -1
  // index du début de l'alias (après éventuel séparateur)
  const leading = m[0].match(/^[^a-z0-9]/i)
  return m.index + (leading ? leading[0].length : 0)
}

/**
 * Normalise un nom d'émetteur détecté via OCR vers le nom canonique suisse.
 */
export function normalizeSwissProvider(raw: string | null | undefined): {
  provider: string | null
  suggestedCategory: string | null
  confidence: number
} {
  if (!raw?.trim()) return { provider: null, suggestedCategory: null, confidence: 0 }
  const n = normalizeForMatch(raw)

  let best: { provider: string; category: string | null; confidence: number; aliasLen: number } | null = null
  for (const entry of SWISS_PROVIDERS) {
    for (const alias of entry.aliases) {
      const a = normalizeForMatch(alias)
      if (!a) continue
      if (n === a || n.includes(a) || a.includes(n)) {
        const confidence = n === a ? 0.98 : a.length >= 6 ? 0.9 : 0.75
        if (!best || confidence > best.confidence || (confidence === best.confidence && a.length > best.aliasLen)) {
          best = {
            provider: entry.canonical,
            category: entry.categories[0] ?? null,
            confidence,
            aliasLen: a.length,
          }
        }
      }
    }
  }
  if (best) {
    return {
      provider: best.provider,
      suggestedCategory: best.category,
      confidence: best.confidence,
    }
  }
  return { provider: raw.trim(), suggestedCategory: null, confidence: 0.4 }
}

/**
 * Cherche un assureur connu dans un long texte OCR.
 * Priorise la première occurrence + alias les plus longs (Assura avant matches courts).
 */
export function detectProviderInText(text: string | null | undefined): {
  provider: string | null
  suggestedCategory: string | null
  confidence: number
} {
  if (!text?.trim()) return { provider: null, suggestedCategory: null, confidence: 0 }
  const head = normalizeForMatch(text.slice(0, 8000))

  let best: {
    provider: string
    category: string | null
    confidence: number
    idx: number
    aliasLen: number
  } | null = null

  for (const entry of SWISS_PROVIDERS) {
    for (const alias of entry.aliases) {
      const a = normalizeForMatch(alias)
      if (a.length < 3) continue
      const idx = findAliasIndex(head, a)
      if (idx < 0) continue
      // Score : tôt dans le document + alias long
      const positionBonus = idx < 200 ? 0.95 : idx < 800 ? 0.88 : 0.72
      const lengthBonus = Math.min(0.08, a.length * 0.008)
      const confidence = Math.min(0.99, positionBonus + lengthBonus)
      if (
        !best ||
        idx < best.idx - 50 ||
        (Math.abs(idx - best.idx) <= 50 && a.length > best.aliasLen) ||
        (idx === best.idx && confidence > best.confidence)
      ) {
        // Prefer earlier match; if close, prefer longer alias
        if (
          !best ||
          idx < best.idx ||
          (idx === best.idx && a.length > best.aliasLen) ||
          (idx > best.idx && idx - best.idx < 30 && a.length > best.aliasLen + 3)
        ) {
          best = {
            provider: entry.canonical,
            category: entry.categories[0] ?? null,
            confidence,
            idx,
            aliasLen: a.length,
          }
        }
      }
    }
  }

  // Pass simplifié : si Assura apparaît clairement, forcer (cas police Assura)
  if (/\bassura\b/.test(head)) {
    return {
      provider: "Assura",
      suggestedCategory: "health_supplementary",
      confidence: 0.96,
    }
  }

  if (!best) return { provider: null, suggestedCategory: null, confidence: 0 }
  return {
    provider: best.provider,
    suggestedCategory: best.category,
    confidence: best.confidence,
  }
}
