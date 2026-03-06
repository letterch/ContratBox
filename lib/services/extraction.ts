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
  cancellationDeadline?: string | null
  keyCoverageSummary?: string | null
  exclusions?: string | null
  mortgageRate?: number | null
  interestAmountPaid?: number | null
  importantClauses?: string | null
  policyNumber?: string | null
  autoRenewal?: boolean | null
  confidenceScore?: number | null
  rawConfidence?: Record<string, number>
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet"

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
- cancellationDeadline (string, date limite de résiliation si déductible)
- keyCoverageSummary (string, résumé des garanties principales)
- exclusions (string, exclusions importantes)
- mortgageRate (number, taux hypothèque si applicable)
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
Réponds uniquement avec le JSON, rien d'autre.`
}

export async function extractContractData(text: string): Promise<ExtractedContractData> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn("[extraction] OPENROUTER_API_KEY manquant")
    return {}
  }
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: buildExtractionPrompt(text) }],
        max_tokens: 2000,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenRouter error: ${res.status} ${err}`)
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error("Réponse vide")
    const parsed = JSON.parse(content) as ExtractedContractData
    return parsed
  } catch (err) {
    console.error("[extraction]", err)
    return {}
  }
}
