import type { DocumentTextExtractionMetaV1 } from "@/lib/types/document-text"

/** Taille max d'un extrait document injecté dans le prompt assistant (par contrat). */
export const DOCUMENT_CONTEXT_PER_CONTRACT_CHARS = 5200

/** Budget total pour les pièces jointes importées depuis l’assistant IA (plusieurs fichiers). */
export const DOCUMENT_CONTEXT_AI_ATTACHMENTS_TOTAL_CHARS = 56_000

/** Max par pièce jointe (répartition si plusieurs imports actifs). */
export const DOCUMENT_CONTEXT_PER_AI_ATTACHMENT_CHARS = 24_000

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
 * Contexte combiné pour les imports assistant (offres / polices hors contrats enregistrés).
 */
export function buildAiAttachmentsContextBlock(
  attachments: Array<{ id: string; label: string; extractedText: string | null; textExtractionMeta: unknown }>,
  maxTotalChars = DOCUMENT_CONTEXT_AI_ATTACHMENTS_TOTAL_CHARS
): string {
  const list = attachments.filter((a) => (a.extractedText ?? "").trim().length > 0)
  if (list.length === 0) return ""
  const per = Math.min(
    DOCUMENT_CONTEXT_PER_AI_ATTACHMENT_CHARS,
    Math.floor(maxTotalChars / Math.max(1, list.length))
  )
  const parts = list.map((a, i) => {
    const block = buildContractDocumentContextBlock(a.extractedText, a.textExtractionMeta, per)
    return `[Import IA #${i + 1} id=${a.id} fichier="${a.label}"]\n${block}`
  })
  const joined = parts.join("\n\n---\n\n")
  return joined.length > maxTotalChars ? `${joined.slice(0, maxTotalChars)}\n[… imports tronqués …]` : joined
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
