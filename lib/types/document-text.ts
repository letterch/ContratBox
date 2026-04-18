/**
 * Métadonnées d'extraction texte (PDF natif + OCR) — stockées en Json sur Document / AdministrativeItem.
 * Sert de base à un futur RAG par page, citations, et outils agent (résiliation, rappels, comparatifs).
 */

export type DocumentTextSource = "pdf_native" | "ocr_tesseract"

export type DocumentTextExtractionMetaV1 = {
  version: 1
  /** Moteur actuel ; les SOTA OSS type PaddleOCR / Surya restent plutôt côté Python — branchables via OCR_REMOTE_URL plus tard */
  pipeline: "tesseract_js_7_pdfjs"
  tesseractLanguages: string
  pdfNativeCharCount: number
  ocrCharCount: number
  mergedCharCount: number
  sources: DocumentTextSource[]
  pages?: Array<{
    page: number
    charCount: number
    meanConfidence?: number
    source: DocumentTextSource
  }>
  ocrRan: boolean
  ocrTruncated?: boolean
  ocrMaxPages?: number
  ocrMode?: string
  /** Erreur non bloquante (ex. timeout partiel) */
  warning?: string
}

export type DocumentTextExtractionMeta = DocumentTextExtractionMetaV1
