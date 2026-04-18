/**
 * Pipeline document : texte PDF natif (pdf-parse) + OCR Tesseract (tesseract.js) sur rendu page (pdf-to-png-converter).
 *
 * Référence marché OSS : les pipelines les plus performants en document (PaddleOCR, Surya, docTR) sont surtout Python ;
 * ici on utilise Tesseract 5 en WASM (Apache 2.0), intégrable sur Node/Railway sans binaire système. Prévoir OCR_REMOTE_URL
 * pour brancher un service Paddle/Surya si besoin SOTA.
 */

import type { DocumentTextExtractionMetaV1, DocumentTextSource } from "@/lib/types/document-text"
import { renderPdfPagesToPng } from "@/lib/services/ocr-pdf-render"
import { ocrPdfPngPages, ocrSingleImage } from "@/lib/services/ocr-tesseract"

async function loadPdfParse() {
  const pdfParse = await import("pdf-parse")
  return pdfParse.default
}

export type ExtractTextFromFileResult = {
  text: string
  hadText: boolean
  meta?: DocumentTextExtractionMetaV1
}

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name]
  if (v === undefined || v === "") return defaultValue
  return !["0", "false", "no", "off"].includes(v.toLowerCase())
}

function mergePdfNativeAndOcr(native: string, ocr: string, mode: string): string {
  const n = native.trim()
  const o = ocr.trim()
  if (mode === "always" && o) return o
  if (!o) return n
  if (!n) return o
  if (o.length >= Math.max(n.length * 0.75, 80)) return o
  return `${n}\n\n--- Texte complété par OCR (image des pages) ---\n\n${o}`
}

export async function extractTextFromPdf(
  buffer: Buffer
): Promise<{ text: string; hadText: boolean; numPages: number }> {
  try {
    const pdfParse = await loadPdfParse()
    const data = await pdfParse(buffer)
    const text = (data?.text ?? "").trim()
    const numPages = typeof data?.numpages === "number" && data.numpages > 0 ? data.numpages : 1
    return { text, hadText: text.length > 100, numPages }
  } catch (err) {
    console.error("[ocr] extractTextFromPdf error:", err)
    return { text: "", hadText: false, numPages: 1 }
  }
}

async function extractPdfWithOptionalOcr(buffer: Buffer): Promise<ExtractTextFromFileResult> {
  const { text: nativeText, hadText, numPages } = await extractTextFromPdf(buffer)
  const mode = (process.env.OCR_MODE ?? "auto").toLowerCase()
  const ocrEnabled = envBool("OCR_ENABLED", true)
  const minNative = Math.max(0, Number(process.env.OCR_MIN_NATIVE_CHARS ?? "180") || 180)
  let needOcr = false
  if (ocrEnabled && mode !== "never") {
    if (mode === "always") needOcr = true
    else needOcr = !hadText || nativeText.trim().length < minNative
  }

  const langs = (process.env.OCR_TESSERACT_LANGS ?? "fra+deu+ita+eng").trim()
  const baseMeta = (partial: Partial<DocumentTextExtractionMetaV1>): DocumentTextExtractionMetaV1 => ({
    version: 1,
    pipeline: "tesseract_js_7_pdfjs",
    tesseractLanguages: langs,
    pdfNativeCharCount: nativeText.length,
    ocrCharCount: 0,
    mergedCharCount: nativeText.length,
    sources: hadText ? (["pdf_native"] as DocumentTextSource[]) : [],
    ocrRan: false,
    ocrMode: mode,
    ...partial,
  })

  if (!needOcr) {
    const merged = nativeText.trim()
    return {
      text: merged,
      hadText: merged.length > 100,
      meta: baseMeta({
        mergedCharCount: merged.length,
        sources: merged.length > 0 ? ["pdf_native"] : [],
      }),
    }
  }

  const maxPages = Math.min(50, Math.max(1, Number(process.env.OCR_MAX_PDF_PAGES ?? "12") || 12))
  const viewportScale = Math.min(2.5, Math.max(1, Number(process.env.OCR_VIEWPORT_SCALE ?? "1.75") || 1.75))

  try {
    const pngPages = await renderPdfPagesToPng(buffer, {
      maxPages,
      totalPagesInDoc: numPages,
      viewportScale,
    })
    const ocrPages = await ocrPdfPngPages(pngPages, langs)
    const ocrText = ocrPages.map((p) => p.text).filter(Boolean).join("\n\n").trim()
    const ocrCharCount = ocrText.length
    const merged = mergePdfNativeAndOcr(nativeText, ocrText, mode).trim()
    const sources: DocumentTextSource[] = []
    if (nativeText.trim().length) sources.push("pdf_native")
    if (ocrCharCount > 0) sources.push("ocr_tesseract")
    if (!sources.length && merged.length) sources.push("pdf_native")

    const pages = ocrPages.map((p) => ({
      page: p.page,
      charCount: p.text.length,
      meanConfidence: p.meanConfidence,
      source: "ocr_tesseract" as const,
    }))

    return {
      text: merged,
      hadText: merged.length > 50,
      meta: baseMeta({
        ocrRan: true,
        ocrCharCount,
        mergedCharCount: merged.length,
        sources: sources.length ? sources : ["ocr_tesseract"],
        pages: pages.length ? pages : undefined,
        ocrTruncated: numPages > maxPages,
        ocrMaxPages: maxPages,
      }),
    }
  } catch (err) {
    console.error("[ocr] pipeline OCR PDF:", err)
    const merged = nativeText.trim()
    return {
      text: merged,
      hadText: merged.length > 100,
      meta: baseMeta({
        ocrRan: false,
        warning: err instanceof Error ? err.message : String(err),
        mergedCharCount: merged.length,
        sources: merged.length > 0 ? ["pdf_native"] : [],
      }),
    }
  }
}

export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<ExtractTextFromFileResult> {
  const ocrEnabled = envBool("OCR_ENABLED", true)
  if (!ocrEnabled) {
    return { text: "", hadText: false }
  }
  const langs = (process.env.OCR_TESSERACT_LANGS ?? "fra+deu+ita+eng").trim()
  try {
    const { text, meanConfidence } = await ocrSingleImage(buffer, langs)
    const merged = text.trim()
    return {
      text: merged,
      hadText: merged.length > 50,
      meta: {
        version: 1,
        pipeline: "tesseract_js_7_pdfjs",
        tesseractLanguages: langs,
        pdfNativeCharCount: 0,
        ocrCharCount: merged.length,
        mergedCharCount: merged.length,
        sources: merged.length ? (["ocr_tesseract"] as DocumentTextSource[]) : [],
        pages: merged.length
          ? [{ page: 1, charCount: merged.length, meanConfidence, source: "ocr_tesseract" as const }]
          : undefined,
        ocrRan: true,
        ocrMode: "image",
      },
    }
  } catch (err) {
    console.error("[ocr] extractTextFromImage:", mimeType, err)
    return { text: "", hadText: false }
  }
}

export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<ExtractTextFromFileResult> {
  if (mimeType === "application/pdf") {
    return extractPdfWithOptionalOcr(buffer)
  }
  if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return extractTextFromImage(buffer, mimeType)
  }
  return { text: "", hadText: false }
}
