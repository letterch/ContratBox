import { pdfToPng } from "pdf-to-png-converter"

export type PdfPngPage = { pageNumber: number; content: Buffer | undefined }

/**
 * Rendu PDF → PNG par page (pdf.js + @napi-rs/canvas), sans Poppler.
 */
export async function renderPdfPagesToPng(
  buffer: Buffer,
  opts: { maxPages: number; totalPagesInDoc: number; viewportScale: number }
): Promise<PdfPngPage[]> {
  const total = Math.max(1, opts.totalPagesInDoc)
  const n = Math.min(Math.max(1, opts.maxPages), total, 80)
  const pagesToProcess = Array.from({ length: n }, (_, i) => i + 1)
  const input = new Uint8Array(buffer)
  const pages = await pdfToPng(input, {
    pagesToProcess,
    viewportScale: opts.viewportScale,
    returnPageContent: true,
    verbosityLevel: 0,
    processPagesInParallel: false,
  })
  return pages.map((p) => ({ pageNumber: p.pageNumber, content: p.content }))
}
