/** Langue de réponse courte pour instruction système du chat assistant. */
export type AssistantReplyLanguage =
  | "fr"
  | "it"
  | "en"
  | "de"
  | "pt"
  | "es"
  | "tr"
  | "sq"

const REPLY_LANG_HINTS: Record<AssistantReplyLanguage, string[]> = {
  fr: [],
  it: ["quando", "assicurazione", "contratto", "scadenza", "disdetta", "ipoteca", "rata"],
  en: ["when", "insurance", "contract", "deadline", "cancellation", "coverage", "mortgage", "rent", "please", "thank"],
  de: ["versicherung", "vertrag", "kündigung", "hypothek", "monatlich", "jährlich", "bitte", "danke"],
  pt: ["mensalidade", "rescisão", "cancelamento", "prémio", "seguradora"],
  es: ["rescisión", "cancelación", "mensualidad", "prima"],
  tr: ["sigorta", "sözleşme", "iptal", "ödeme", "kira"],
  sq: ["sigurimi", "kontrata", "pagesa", "mbulimi", "kërkesë"],
}

const REPLY_LANG_INSTRUCTIONS: Record<AssistantReplyLanguage, string> = {
  fr: "Réponds en français clairement. Si des données manquent (contrats ou documents importés), indique-le explicitement.",
  it: "Rispondi in italiano con chiarezza. Se mancano dati, dichiaralo esplicitamente.",
  en: "Answer in English clearly. If data is missing, state it explicitly.",
  de: "Antworte auf Deutsch klar und prägnant. Fehlende Daten explizit nennen.",
  pt: "Responda em português com clareza. Indique explicitamente dados em falta.",
  es: "Responde en español con claridad. Indica explícitamente los datos que falten.",
  tr: "Türkçe olarak net yanıt ver. Eksik verileri açıkça belirt.",
  sq: "Përgjigju në shqip qartë. Thekso eksplicitisht nëse mungojnë të dhëna.",
}

export function detectAssistantReplyLanguage(message: string): AssistantReplyLanguage {
  const m = message.toLowerCase()
  if (m.includes("rescisão")) return "pt"
  if (m.includes("rescisión")) return "es"
  const order: AssistantReplyLanguage[] = ["sq", "tr", "pt", "es", "de", "it", "en", "fr"]
  for (const lang of order) {
    const hints = REPLY_LANG_HINTS[lang]
    if (hints.some((w) => m.includes(w))) return lang
  }
  return "fr"
}

export function assistantReplyLanguageInstruction(lang: AssistantReplyLanguage): string {
  return REPLY_LANG_INSTRUCTIONS[lang]
}

/** Prompt utilisateur pour résumé multi-langues des pièces importées (assistant). */
export const MULTILINGUAL_SUMMARY_PROMPT = `Analyse le ou les document(s) importé(s) sélectionné(s) dans l’assistant (texte fourni dans le contexte « Imports IA »).

1) Synthèse structurée en français pour un assuré en Suisse : produit / assureur si identifiable, couvertures principales, exclusions ou limitations importantes, franchises ou participation aux coûts, primes ou cotisations si mentionnées, durée / tacite reconduction / résiliation si mentionné.

2) Ensuite la même synthèse répétée sous forme de blocs séparés, chaque bloc avec un titre de langue obligatoire :
- Italiano
- English
- Deutsch
- Português
- Español
- Türkçe
- Shqip (albanais)

Si une information n’apparaît pas dans le document, écris « non précisé dans le document » dans la langue du bloc (sans inventer).
Ne pas afficher de données personnelles complètes (adresses entières, numéros de police complets) : tu peux résumer ou anonymiser partiellement.
`
