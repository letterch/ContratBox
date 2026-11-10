import type { ContractCategorySlug } from "@/lib/constants"
import { detectProviderInText, normalizeSwissProvider } from "@/lib/config/swiss-insurers"
import type { ExtractedContractData } from "@/lib/services/extraction"
import { normalizeOcrExtractedText } from "@/lib/services/ocr-text-normalize"

const EU_DATE = /(\d{1,2})[./](\d{1,2})[./](\d{4})/
const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/

function toIsoDate(raw: string): string | null {
  const eu = raw.match(EU_DATE)
  if (eu) {
    return `${eu[3]}-${eu[2].padStart(2, "0")}-${eu[1].padStart(2, "0")}`
  }
  const iso = raw.match(ISO_DATE)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return null
}

function parseSwissAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/CHF/gi, "")
    .replace(/\s/g, "")
    .replace(/'/g, "")
    .replace(/’/g, "")
    .replace(",", ".")
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Extrait des champs structurés directement depuis le texte (indépendant du LLM).
 * Couvre notamment les polices Assura LCA multi-produits.
 */
export function extractSwissPolicyHeuristics(rawText: string): Partial<ExtractedContractData> {
  const text = normalizeOcrExtractedText(rawText)
  const lower = text.toLowerCase()
  const out: Partial<ExtractedContractData> = {}
  const conf: Record<string, number> = {}

  const providerHit = detectProviderInText(text)
  if (providerHit.provider) {
    out.provider = providerHit.provider
    conf.provider = Math.round(providerHit.confidence * 100)
    if (providerHit.suggestedCategory) {
      out.suggestedCategory = providerHit.suggestedCategory as ContractCategorySlug
      conf.suggestedCategory = 85
    }
  }

  // Complémentaire LCA / LAMal
  const isComplementary =
    /assurance\s+compl[eé]mentaire|compl[eé]menta|selon\s+la\s+loi\s+f[eé]d[eé]rale\s+sur\s+le\s+contrat\s+d['']assurance|\blca\b/.test(
      lower
    )
  const isBasicHealth = /lamal|assurance[- ]maladie\s+obligatoire|loi\s+fédérale\s+sur\s+l['']assurance[- ]maladie/.test(
    lower
  )
  if (isComplementary && !isBasicHealth) {
    out.suggestedCategory = "health_supplementary"
    out.contractType = out.contractType ?? "Assurance complémentaire (LCA)"
    conf.suggestedCategory = 92
  } else if (isBasicHealth) {
    out.suggestedCategory = "health_basic"
    out.contractType = out.contractType ?? "Assurance maladie de base (LAMal)"
    conf.suggestedCategory = 90
  }

  // Bloc Assura : "Assuré(e) Police n° … Maria Petronio 1169444 28.03.1987"
  const assuraHeader = text.match(
    /assur[eé]\(?e?\)?[\s\S]{0,120}?([A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸ][a-zàâäéèêëîïôöùûüÿ'’\-]+\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸ][a-zàâäéèêëîïôöùûüÿ'’\-]+)\s+(\d{6,8})\b/i
  )
  if (assuraHeader) {
    out.insuredPersonName = assuraHeader[1].replace(/\s+/g, " ").trim()
    out.policyNumber = assuraHeader[2]
    conf.insuredPersonName = 94
    conf.policyNumber = 96
  }

  // N° de police (fallback)
  if (!out.policyNumber) {
    const policyMatch =
      text.match(/police\s*n[°o.]?\s*[:#]?\s*(\d{5,12})/i) ||
      text.match(/pollce\s*n[°o.]?\s*[:#]?\s*(\d{5,12})/i) ||
      text.match(/\bpolice\s+(\d{5,12})\b/i)
    if (policyMatch) {
      out.policyNumber = policyMatch[1]
      conf.policyNumber = 90
    }
  }

  // Assuré (fallback)
  if (!out.insuredPersonName) {
    const insuredMatch =
      text.match(
        /Madame\s+(?:\d{4}\s+\w+\s+)?([A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸ][a-zàâäéèêëîïôöùûüÿ'’\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸ][a-zàâäéèêëîïôöùûüÿ'’\-]+)+)/
      ) ||
      text.match(
        /Monsieur\s+(?:\d{4}\s+\w+\s+)?([A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸ][a-zàâäéèêëîïôöùûüÿ'’\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸ][a-zàâäéèêëîïôöùûüÿ'’\-]+)+)/
      )
    if (insuredMatch) {
      out.insuredPersonName = insuredMatch[1].replace(/\s+/g, " ").trim()
      conf.insuredPersonName = 88
    }
  }

  // Dates : "Valable dès le 01.01.2024" prioritaire pour start/renewal année police
  const validFrom = text.match(/valable\s+d[eè]s\s+le\s+(\d{1,2}[./]\d{1,2}[./]\d{4})/i)
  const entryForce = text.match(/entr[eé]e\s+en\s+vigueur[^0-9]{0,40}(\d{1,2}[./]\d{1,2}[./]\d{4})/i)
  const echeance = text.match(/[eé]ch[eé]ance[^0-9]{0,60}(\d{1,2}[./]\d{1,2}[./]\d{4})/i)

  if (validFrom) {
    out.startDate = toIsoDate(validFrom[1])
    conf.startDate = 90
  } else if (entryForce) {
    out.startDate = toIsoDate(entryForce[1])
    conf.startDate = 80
  }
  if (echeance) {
    out.endDate = toIsoDate(echeance[1])
    out.renewalDate = out.endDate
    conf.endDate = 85
    conf.renewalDate = 80
  }

  // Renouvellement tacite annuel → préavis typique LCA complémentaire souvent 3 mois (indicatif si non trouvé)
  if (/renouvel[eé]e?\s+tacitement|reconduction\s+tacite/i.test(text)) {
    out.autoRenewal = true
    conf.autoRenewal = 85
  }

  // Total LCA : le montant est souvent en fin de page après le libellé (Assura)
  let monthlyTotal: number | null = null
  const totalBlock = text.match(/total\s+lca[\s\S]{0,500}/i)
  if (totalBlock) {
    const amounts = [...totalBlock[0].matchAll(/(\d+[.,]\d{2})/g)].map((m) => parseSwissAmount(m[1]))
    const plausible = amounts.filter((a): a is number => a != null && a >= 5 && a <= 500)
    if (plausible.length) {
      // Le total est généralement le dernier montant plausible du bloc (ex. 35.95)
      monthlyTotal = plausible[plausible.length - 1]
    }
  }
  // Fallback : sommer les primes nettes "brut - rabais = net" (13.20 -2.00 11.20)
  if (monthlyTotal == null) {
    const nets = [...text.matchAll(/(\d+[.,]\d{2})\s*-\s*(\d+[.,]\d{2})\s+(\d+[.,]\d{2})/g)]
      .map((m) => parseSwissAmount(m[3]))
      .filter((a): a is number => a != null && a >= 0.5 && a <= 200)
    if (nets.length >= 2) {
      monthlyTotal = Math.round(nets.reduce((s, n) => s + n, 0) * 100) / 100
    }
  }
  if (monthlyTotal == null) {
    const totalPrimes = text.match(
      /total\s+(?:des\s+)?primes?\s+mensuelles?[^0-9]{0,80}(\d+[.,]\d{2})/i
    )
    if (totalPrimes) monthlyTotal = parseSwissAmount(totalPrimes[1])
  }

  if (monthlyTotal != null && monthlyTotal > 0 && monthlyTotal < 2000) {
    out.monthlyPremium = monthlyTotal
    out.annualPremium = Math.round(monthlyTotal * 12 * 100) / 100
    conf.monthlyPremium = 95
    conf.annualPremium = 90
  }

  // Produits Assura typiques → résumé couvertures
  const products: string[] = []
  if (/complementa/i.test(text)) products.push("Complementa Extra (soins spéciaux étendus)")
  if (/\bhospita\b/i.test(text)) products.push("Hospita (capital hospitalisation)")
  if (/\bnatura\b/i.test(text)) products.push("Natura (médecines alternatives / thérapeutes)")
  if (/\bmedna\b/i.test(text)) products.push("Medna (médecines alternatives / médecins)")
  if (products.length) {
    out.keyCoverageSummary = products.join(" ; ")
    out.title =
      out.title ??
      (out.provider
        ? `${out.provider} — complémentaire (${products.length} produits)`
        : `Assurance complémentaire (${products.length} produits)`)
    conf.keyCoverageSummary = 88
  }

  // Sans couverture accidents
  if (/sans\s+couverture\s+des\s+accidents/i.test(text)) {
    out.exclusions = (out.exclusions ? `${out.exclusions} ; ` : "") + "Sans couverture des accidents"
  }

  if (Object.keys(conf).length) out.rawConfidence = conf
  if (!out.confidenceScore) {
    const vals = Object.values(conf)
    out.confidenceScore = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : undefined
  }

  return out
}

/**
 * Fusionne LLM + heuristiques document : le texte OCR gagne sur le provider / primes aberrantes.
 */
export function reconcileExtractionWithDocument(
  llmData: ExtractedContractData,
  rawText: string,
  filenameHint?: string | null
): ExtractedContractData {
  const heuristics = extractSwissPolicyHeuristics(rawText)
  const out: ExtractedContractData = { ...llmData }
  const conf = { ...(llmData.rawConfidence ?? {}), ...(heuristics.rawConfidence ?? {}) }

  // Filename hint (ex. "Assura complementaires Maria.pdf")
  if (filenameHint) {
    const fromName = normalizeSwissProvider(filenameHint.replace(/[_.-]+/g, " "))
    if (fromName.provider && fromName.confidence >= 0.7) {
      // Ne force que si le texte confirme ou si le LLM est vide/suspect
      const textHit = detectProviderInText(rawText)
      if (!out.provider || (textHit.provider && textHit.provider === fromName.provider)) {
        out.provider = fromName.provider
        conf.provider = Math.max(conf.provider ?? 0, 88)
      }
      if (!out.suggestedCategory && fromName.suggestedCategory) {
        out.suggestedCategory = fromName.suggestedCategory as ContractCategorySlug
      }
    }
    if (/compl[eé]mentaire/i.test(filenameHint) && !out.suggestedCategory) {
      out.suggestedCategory = "health_supplementary"
    }
  }

  // Provider : si le texte contient clairement un assureur, il écrase le LLM (évite Helvetia halluciné)
  const textProvider = detectProviderInText(rawText)
  if (textProvider.provider && textProvider.confidence >= 0.7) {
    const llmNorm = out.provider ? normalizeSwissProvider(out.provider).provider : null
    if (!llmNorm || llmNorm !== textProvider.provider) {
      out.provider = textProvider.provider
      conf.provider = Math.round(textProvider.confidence * 100)
    } else {
      out.provider = textProvider.provider
    }
    if (textProvider.suggestedCategory && (!out.suggestedCategory || out.suggestedCategory === "other")) {
      out.suggestedCategory = textProvider.suggestedCategory as ContractCategorySlug
    }
  }

  // Catégorie / type / police / assuré / dates depuis heuristiques si absents ou plus fiables
  if (heuristics.suggestedCategory) out.suggestedCategory = heuristics.suggestedCategory
  if (heuristics.contractType) out.contractType = heuristics.contractType
  if (heuristics.policyNumber) out.policyNumber = heuristics.policyNumber
  if (heuristics.insuredPersonName) out.insuredPersonName = heuristics.insuredPersonName
  if (heuristics.startDate) out.startDate = heuristics.startDate
  if (heuristics.endDate) out.endDate = heuristics.endDate
  if (heuristics.renewalDate) out.renewalDate = heuristics.renewalDate
  if (heuristics.autoRenewal != null) out.autoRenewal = heuristics.autoRenewal
  if (heuristics.keyCoverageSummary) out.keyCoverageSummary = heuristics.keyCoverageSummary
  if (heuristics.exclusions) out.exclusions = heuristics.exclusions
  if (heuristics.title && !out.title) out.title = heuristics.title

  // Primes : corriger 13.20 → 1320 et préférer Total LCA
  if (heuristics.monthlyPremium != null) {
    out.monthlyPremium = heuristics.monthlyPremium
    out.annualPremium = heuristics.annualPremium ?? Math.round(heuristics.monthlyPremium * 12 * 100) / 100
  } else {
    out.monthlyPremium = sanitizePremium(out.monthlyPremium, "monthly")
    out.annualPremium = sanitizePremium(out.annualPremium, "annual")
    // Si monthly absurde (≥ 500) et annual cohérent, dériver monthly
    if (
      out.monthlyPremium != null &&
      out.monthlyPremium >= 500 &&
      out.annualPremium != null &&
      out.annualPremium > 0 &&
      out.annualPremium < 5000
    ) {
      out.monthlyPremium = Math.round((out.annualPremium / 12) * 100) / 100
    }
    // 1320 pour une complémentaire = souvent 13.20 mal lu
    if (out.monthlyPremium != null && out.monthlyPremium >= 200 && out.suggestedCategory === "health_supplementary") {
      const maybe = out.monthlyPremium / 100
      if (maybe >= 5 && maybe <= 150) {
        out.monthlyPremium = maybe
        out.annualPremium = Math.round(maybe * 12 * 100) / 100
        conf.monthlyPremium = 60
      }
    }
  }

  out.rawConfidence = conf
  if (heuristics.confidenceScore && (!out.confidenceScore || out.confidenceScore < heuristics.confidenceScore)) {
    out.confidenceScore = heuristics.confidenceScore
  }

  return out
}

function sanitizePremium(value: number | null | undefined, kind: "monthly" | "annual"): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  // Plafonds de sécurité (évite hallucinations extrêmes)
  if (kind === "monthly" && value > 20000) return null
  if (kind === "annual" && value > 200000) return null
  return value
}
