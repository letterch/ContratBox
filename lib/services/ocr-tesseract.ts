import { preprocessImageForOcr } from "@/lib/services/ocr-image"
import type { PdfPngPage } from "@/lib/services/ocr-pdf-render"

export type TesseractPageResult = {
  page: number
  text: string
  meanConfidence: number
}

/**
 * OCR avec Tesseract 5 (Apache 2.0) via tesseract.js — meilleur compromis OSS intégrable en Node sans service Python.
 * PaddleOCR / Surya restent optionnels derrière un microservice (variable OCR_REMOTE_URL, à brancher plus tard).
 */
export async function ocrPdfPngPages(pages: PdfPngPage[], langs: string): Promise<TesseractPageResult[]> {
  const { createWorker } = await import("tesseract.js")
  const worker = await createWorker(langs)
  const out: TesseractPageResult[] = []
  try {
    for (const p of pages) {
      if (!p.content?.length) continue
      const prep = await preprocessImageForOcr(p.content)
      const { data } = await worker.recognize(prep)
      const text = (data.text ?? "").trim()
      const meanConfidence = typeof data.confidence === "number" ? data.confidence : 0
      out.push({ page: p.pageNumber, text, meanConfidence })
    }
  } finally {
    await worker.terminate().catch(() => {})
  }
  return out
}

export async function ocrSingleImage(buffer: Buffer, langs: string): Promise<{ text: string; meanConfidence: number }> {
  const { createWorker } = await import("tesseract.js")
  const worker = await createWorker(langs)
  try {
    const png = await sharpBufferToPng(buffer)
    const prep = await preprocessImageForOcr(png)
    const { data } = await worker.recognize(prep)
    return {
      text: (data.text ?? "").trim(),
      meanConfidence: typeof data.confidence === "number" ? data.confidence : 0,
    }
  } finally {
    await worker.terminate().catch(() => {})
  }
}

async function sharpBufferToPng(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default
  return sharp(buffer).png().toBuffer()
}
