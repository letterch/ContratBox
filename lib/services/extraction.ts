import { CONTRACT_CATEGORIES, type ContractCategorySlug } from "@/lib/constants"

export type ExtractedContractData = {
  title?: string | null
  provider?: string | null
  contractType?: string | null
  suggestedCategory?: ContractCategorySlug | null
  monthlyPremium?: number | null
  annualPremium?: number | null
  startDate?: string | null
  renewalDate?: string | null
  endDate?: string | null
  maturityDate?: string | null
  cancellationNoticeDays?: number | null
  cancellationNoticeValue?: number | null
  cancellationNoticeUnit?: "days" | "months" | "years" | null
  cancellationNoticeText?: string | null
  cancellationDeadline?: string | null
  minimumCommitmentValue?: number | null
  minimumCommitmentUnit?: "months" | "years" | null
  minimumCommitmentEndDate?: string | null
  leaseMonthlyRent?: number | null
  leaseMonthlyCharges?: number | null
  leaseTacitRenewal?: boolean | null
  leaseEndDate?: string | null
  leaseNoticeValue?: number | null
  leaseNoticeUnit?: "days" | "months" | "years" | null
  leaseNoticeText?: string | null
  keyCoverageSummary?: string | null
  exclusions?: string | null
  mortgageRate?: number | null
  mortgagePrincipal?: number | null
  amortizationType?: "direct" | "indirect" | "none" | null
  mortgageTranches?:
    | Array<{
        name?: string | null
        principal?: number | null
        rate?: number | null
        startDate?: string | null
        endDate?: string | null
        amortizationType?: "direct" | "indirect" | "none" | null
      }>
    | null
  interestAmountPaid?: number | null
  importantClauses?: string | null
  policyNumber?: string | null
  autoRenewal?: boolean | null
  confidenceScore?: number | null
  rawConfidence?: Record<string, number>
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet"
const EXTRACTION_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 30000)

function buildExtractionPrompt(text: string): string {
  const categoriesList = Object.entries(CONTRACT_CATEGORIES)
    .map(([slug, label]) => `${slug}: ${label}`)
    .join("\n")
  return `Tu es un assistant d'extraction de données pour des contrats (assurances, abonnements, hypothèques, etc.) en Suisse.

Extrait les champs suivants du texte du contrat ci-dessous. Réponds UNIQUEMENT en JSON valide, sans markdown, avec les clés exactes suivantes (utilise null si non trouvé ou non applicable) :
- title (string)
- provider (string, nom de l'entreprise/prestataire)
- contractType (string, ex: "Assurance ménage", "Internet + TV")
- suggestedCategory (string, un des slugs: ${Object.keys(CONTRACT_CATEGORIES).join(", ")})
- monthlyPremium (number, en CHF)
- annualPremium (number, en CHF)
- startDate (string ISO date ou JJ.MM.AAAA)
- renewalDate (string)
- endDate (string)
- maturityDate (string, pour hypothèque)
- cancellationNoticeDays (number, délai de préavis en jours)
- cancellationNoticeValue (number, valeur brute du préavis, ex 2)
- cancellationNoticeUnit (string: "days" | "months" | "years")
- cancellationNoticeText (string, ex: "2 mois")
- cancellationDeadline (string, date limite de résiliation si déductible)
- minimumCommitmentValue (number, ex: 24)
- minimumCommitmentUnit (string: "months" | "years")
- minimumCommitmentEndDate (string, si date explicitement trouvée)
- leaseMonthlyRent (number, loyer mensuel hors charges)
- leaseMonthlyCharges (number, charges mensuelles)
- leaseTacitRenewal (boolean)
- leaseEndDate (string)
- leaseNoticeValue (number)
- leaseNoticeUnit (string: "days" | "months" | "years")
- leaseNoticeText (string)
- keyCoverageSummary (string, résumé des garanties principales)
- exclusions (string, exclusions importantes)
- mortgageRate (number, taux hypothèque si applicable)
- mortgagePrincipal (number, capital hypothécaire restant/initial en CHF si mentionné)
- amortizationType (string: "direct" | "indirect" | "none")
- mortgageTranches (array de tranches: {name, principal, rate, startDate, endDate, amortizationType})
- interestAmountPaid (number, intérêts payés si mentionné)
- importantClauses (string)
- policyNumber (string)
- autoRenewal (boolean)
- confidenceScore (number 0-100, confiance globale)
- rawConfidence (object avec clés des champs et valeur 0-100 pour chaque champ extrait)

Catégories possibles :
${categoriesList}

Texte du contrat (extrait OCR/PDF) :
---
${text.slice(0, 12000)}
---
Règles d'interprétation:
- Si une info est absente: null.
- Dates au format ISO YYYY-MM-DD quand possible.
- Si préavis est exprimé en mois/années, renseigne cancellationNoticeValue + cancellationNoticeUnit.
- Reconnais les formulations "préavis", "Kündigungsfrist", "Frist", "délai de résiliation".
- Extrais aussi la date de début et la durée minimale d'engagement si présentes.
- Pour les hypothèques, extrais les tranches séparément quand présentes (LIBOR/SARON/fixe etc).
- Pour les baux, extrais loyer hors charges, charges, renouvellement tacite et délai de résiliation.

Réponds uniquement avec le JSON, rien d'autre.`
}

function parseModelJson(content: string): Record<string, unknown> {
  const trimmed = content.trim().replace(/^\uFEFF/, "")
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start >= 0 && end > start) {
      const slice = raw.slice(start, end + 1)
      return JSON.parse(slice) as Record<string, unknown>
    }
    throw new Error("Impossible d'extraire un objet JSON de la réponse du modèle")
  }
}

function parseNoticeTextToDays(text?: string | null): number | null {
  if (!text) return null
  const lower = text.toLowerCase()
  const numberMatch = lower.match(/(\d+[.,]?\d*)/)
  if (!numberMatch) return null
  const value = Number(numberMatch[1].replace(",", "."))
  if (!Number.isFinite(value)) return null
  if (lower.includes("mois") || lower.includes("monat")) return Math.round(value * 30)
  if (lower.includes("an") || lower.includes("année") || lower.includes("annee") || lower.includes("jahr")) return Math.round(value * 365)
  if (lower.includes("jour") || lower.includes("tag")) return Math.round(value)
  return null
}

function normalizeDateString(value?: string | null): string | null {
  if (!value) return null
  const v = value.trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const eu = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (eu) {
    const dd = eu[1].padStart(2, "0")
    const mm = eu[2].padStart(2, "0")
    const yyyy = eu[3]
    return `${yyyy}-${mm}-${dd}`
  }
  const asDate = new Date(v)
  if (Number.isNaN(asDate.getTime())) return value
  return asDate.toISOString().slice(0, 10)
}

function normalizeExtraction(input: Record<string, unknown>): ExtractedContractData {
  const out = { ...input } as ExtractedContractData
  out.startDate = normalizeDateString(out.startDate)
  out.renewalDate = normalizeDateString(out.renewalDate)
  out.endDate = normalizeDateString(out.endDate)
  out.maturityDate = normalizeDateString(out.maturityDate)
  out.cancellationDeadline = normalizeDateString(out.cancellationDeadline)
  out.minimumCommitmentEndDate = normalizeDateString(out.minimumCommitmentEndDate)
  out.leaseEndDate = normalizeDateString(out.leaseEndDate)
  const value = Number(out.cancellationNoticeValue)
  const unit = out.cancellationNoticeUnit
  if ((!out.cancellationNoticeDays || out.cancellationNoticeDays <= 0) && Number.isFinite(value) && value > 0) {
    if (unit === "months") out.cancellationNoticeDays = Math.round(value * 30)
    else if (unit === "years") out.cancellationNoticeDays = Math.round(value * 365)
    else out.cancellationNoticeDays = Math.round(value)
  }
  if ((!out.cancellationNoticeDays || out.cancellationNoticeDays <= 0) && out.cancellationNoticeText) {
    out.cancellationNoticeDays = parseNoticeTextToDays(out.cancellationNoticeText)
  }
  if (Array.isArray(out.mortgageTranches)) {
    out.mortgageTranches = out.mortgageTranches.map((t) => ({
      ...t,
      startDate: normalizeDateString(t.startDate),
      endDate: normalizeDateString(t.endDate),
    }))
  }
  if ((!out.cancellationNoticeDays || out.cancellationNoticeDays <= 0) && out.leaseNoticeText) {
    out.cancellationNoticeDays = parseNoticeTextToDays(out.leaseNoticeText)
  }
  return out
}

/** Raison lorsque `data` ne contient aucune info utile (diagnostic UI / logs). */
export type ContractExtractionFailureReason =
  | "no_api_key"
  | "api_error"
  | "empty_model_reply"
  | "json_parse_error"

export type ContractExtractionOutcome = {
  data: ExtractedContractData
  failureReason?: ContractExtractionFailureReason
}

function hasUsefulExtractedFields(d: ExtractedContractData): boolean {
  const candidates: unknown[] = [
    d.provider,
    d.title,
    d.contractType,
    d.monthlyPremium,
    d.annualPremium,
    d.policyNumber,
    d.startDate,
    d.keyCoverageSummary,
  ]
  return candidates.some((v) => v != null && v !== "")
}

/** Message court pour bannière UI après upload / inbox. */
export function userFacingExtractionWarning(
  outcome: ContractExtractionOutcome,
  hadExtractableText: boolean
): string | undefined {
  if (outcome.failureReason) {
    switch (outcome.failureReason) {
      case "no_api_key":
        return "L'extraction IA n'est pas configurée sur ce serveur (variable OPENROUTER_API_KEY). Vous pouvez compléter le formulaire manuellement."
      case "api_error":
        return "L'appel au service d'extraction a échoué (réseau, quota ou modèle). Réessayez plus tard ou saisissez le contrat à la main."
      case "empty_model_reply":
        return "Le modèle n'a renvoyé aucun texte exploitable. Réessayez ou complétez le formulaire manuellement."
      case "json_parse_error":
        return "La réponse du modèle n'a pas pu être interprétée. Réessayez ou complétez le formulaire manuellement."
      default:
        return "Extraction incomplète. Complétez le formulaire manuellement."
    }
  }
  if (hadExtractableText && !hasUsefulExtractedFields(outcome.data)) {
    return "Le PDF contient du texte mais aucun champ n'a été identifié avec certitude. Vérifiez le document (qualité du texte) ou saisissez les informations à la main."
  }
  if (!hadExtractableText && !hasUsefulExtractedFields(outcome.data)) {
    return "Ce fichier semble être un scan ou une image sans texte sélectionnable : l'extraction automatique est limitée. Saisissez le contrat manuellement ou utilisez un PDF avec texte copiable."
  }
  return undefined
}

export async function extractContractData(text: string): Promise<ContractExtractionOutcome> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn("[extraction] OPENROUTER_API_KEY manquant")
    return { data: {}, failureReason: "no_api_key" }
  }
  let lastError: unknown = null
  let lastHadContent = false
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT_MS)
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
          messages: [{ role: "user", content: buildExtractionPrompt(text) }],
          max_tokens: 4096,
          temperature: 0,
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`OpenRouter error: ${res.status} ${err}`)
      }
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error("Réponse vide")
      lastHadContent = true
      const parsed = parseModelJson(content)
      return { data: normalizeExtraction(parsed) }
    } catch (err) {
      lastError = err
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000))
    } finally {
      clearTimeout(timeout)
    }
  }
  console.error("[extraction]", lastError)
  if (lastError instanceof Error && lastError.message === "Réponse vide") {
    return { data: {}, failureReason: "empty_model_reply" }
  }
  return {
    data: {},
    failureReason: lastHadContent ? "json_parse_error" : "api_error",
  }
}
