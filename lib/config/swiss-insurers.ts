/**
 * Lexicon assureurs / opérateurs suisses pour OCR et extraction.
 * Aide à normaliser le provider même si le PDF est mal scanné.
 */

export type SwissProviderEntry = {
  canonical: string
  aliases: string[]
  categories: string[]
}

export const SWISS_PROVIDERS: SwissProviderEntry[] = [
  { canonical: "Mobilière", aliases: ["mobiliere", "mobiliare", "die mobiliar", "la mobiliere"], categories: ["household_insurance", "liability", "car", "legal"] },
  { canonical: "Helvetia", aliases: ["helvetia", "helvetia assurances"], categories: ["household_insurance", "liability", "life", "building"] },
  { canonical: "AXA", aliases: ["axa", "axa winterthur", "axa-aragon"], categories: ["household_insurance", "liability", "car", "life"] },
  { canonical: "Zurich", aliases: ["zurich", "zurich insurance", "zurich assurances"], categories: ["household_insurance", "liability", "car"] },
  { canonical: "Bâloise", aliases: ["baloise", "bâloise", "basler"], categories: ["household_insurance", "liability", "life"] },
  { canonical: "Generali", aliases: ["generali", "generali suisse"], categories: ["household_insurance", "life"] },
  { canonical: "Vaudoise", aliases: ["vaudoise", "vaudoise assurances"], categories: ["household_insurance", "liability", "car"] },
  { canonical: "CSS", aliases: ["css", "css assurance", "css Kranken"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Helsana", aliases: ["helsana"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Swica", aliases: ["swica"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Groupe Mutuel", aliases: ["groupe mutuel", "mutuel"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Assura", aliases: ["assura"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Concordia", aliases: ["concordia"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Visana", aliases: ["visana"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Sanitas", aliases: ["sanitas"], categories: ["health_basic", "health_complementary"] },
  { canonical: "Swisscom", aliases: ["swisscom"], categories: ["telecom"] },
  { canonical: "Sunrise", aliases: ["sunrise", "upc sunrise"], categories: ["telecom"] },
  { canonical: "Salt", aliases: ["salt"], categories: ["telecom"] },
  { canonical: "Romande Énergie", aliases: ["romande energie", "romande énergie", "sie"], categories: ["energy"] },
  { canonical: "ECA", aliases: ["eca", "etablissement cantonal d'assurance", "établissement cantonal"], categories: ["building"] },
  { canonical: "TCS", aliases: ["tcs", "touring club suisse"], categories: ["car", "legal"] },
  { canonical: "DAS", aliases: ["das", "das protection juridique"], categories: ["legal"] },
  { canonical: "CAP", aliases: ["cap", "cap protection juridique"], categories: ["legal"] },
]

/**
 * Normalise un nom d'émetteur détecté via OCR vers le nom canonique suisse.
 */
export function normalizeSwissProvider(raw: string | null | undefined): {
  provider: string | null
  suggestedCategory: string | null
  confidence: number
} {
  if (!raw?.trim()) return { provider: null, suggestedCategory: null, confidence: 0 }
  const n = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  for (const entry of SWISS_PROVIDERS) {
    for (const alias of entry.aliases) {
      if (n.includes(alias) || alias.includes(n)) {
        return {
          provider: entry.canonical,
          suggestedCategory: entry.categories[0] ?? null,
          confidence: n === alias ? 0.98 : 0.85,
        }
      }
    }
  }
  return { provider: raw.trim(), suggestedCategory: null, confidence: 0.4 }
}

/**
 * Cherche un assureur connu dans un long texte OCR.
 */
export function detectProviderInText(text: string | null | undefined): {
  provider: string | null
  suggestedCategory: string | null
  confidence: number
} {
  if (!text?.trim()) return { provider: null, suggestedCategory: null, confidence: 0 }
  const head = text.slice(0, 4000)
  const n = head
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  let best: { provider: string; category: string | null; confidence: number; idx: number } | null = null
  for (const entry of SWISS_PROVIDERS) {
    for (const alias of entry.aliases) {
      const idx = n.indexOf(alias)
      if (idx >= 0) {
        const conf = idx < 400 ? 0.9 : 0.7
        if (!best || idx < best.idx || conf > best.confidence) {
          best = {
            provider: entry.canonical,
            category: entry.categories[0] ?? null,
            confidence: conf,
            idx,
          }
        }
      }
    }
  }
  if (!best) return { provider: null, suggestedCategory: null, confidence: 0 }
  return {
    provider: best.provider,
    suggestedCategory: best.category,
    confidence: best.confidence,
  }
}
