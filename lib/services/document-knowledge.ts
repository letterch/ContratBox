import type { DocumentTextExtractionMetaV1 } from "@/lib/types/document-text"

/** Taille max d'un extrait document injecté dans le prompt assistant (par contrat). */
export const DOCUMENT_CONTEXT_PER_CONTRACT_CHARS = 5200

/** Taille cible d'un chunk pour futur index vectoriel / RAG par document. */
export const DOCUMENT_RAG_CHUNK_TARGET_CHARS = 3400

/**
 * Découpe un long texte pour indexation future (embeddings, retrieval hybride).
 */
export function chunkTextForFutureRag(text: string, maxChunk = DOCUMENT_RAG_CHUNK_TARGET_CHARS): string[] {
  const t = text.trim()
  if (!t) return []
  const chunks: string[] = []
  let i = 0
  while (i < t.length) {
    chunks.push(t.slice(i, i + maxChunk))
    i += maxChunk
  }
  return chunks
}

/** Résumé structuré des sources pour enrichir le prompt (sans surcharger). */
export function summarizeTextExtractionMeta(meta: DocumentTextExtractionMetaV1 | null | undefined): string {
  if (!meta) return ""
  const parts = [
    `pipeline=${meta.pipeline}`,
    `sources=${meta.sources.join("+")}`,
    `native=${meta.pdfNativeCharCount} ocr=${meta.ocrCharCount} merged=${meta.mergedCharCount}`,
  ]
  if (meta.ocrTruncated) parts.push(`ocr_truncated_max_pages=${meta.ocrMaxPages ?? "?"}`)
  if (meta.warning) parts.push(`warning=${meta.warning}`)
  return parts.join(" | ")
}

/**
 * Extrait document à injecter dans le contexte LLM (tronqué). À utiliser côté assistant / agent.
 */
export function buildContractDocumentContextBlock(
  extractedText: string | null | undefined,
  meta: unknown,
  maxChars = DOCUMENT_CONTEXT_PER_CONTRACT_CHARS
): string {
  const text = (extractedText ?? "").trim()
  if (!text) return ""
  const metaLine =
    meta && typeof meta === "object" && (meta as DocumentTextExtractionMetaV1).version === 1
      ? summarizeTextExtractionMeta(meta as DocumentTextExtractionMetaV1)
      : ""
  const body = text.length > maxChars ? `${text.slice(0, maxChars)}\n[… texte tronqué …]` : text
  return metaLine ? `${metaLine}\n${body}` : body
}

/**
 * Feuille de route produit : types d’actions concrètes que l’agent pourra proposer / exécuter plus tard (hors LLM).
 * Référencer dans les prompts système pour aligner les réponses utilisateur.
 */
export const AGENT_ACTION_ROADMAP = [
  "draft_cancellation_letter",
  "schedule_cancellation_reminder",
  "compare_insurance_offers",
  "export_contract_summary",
  "highlight_coverage_gaps",
] as const

export type AgentActionRoadmapSlug = (typeof AGENT_ACTION_ROADMAP)[number]
