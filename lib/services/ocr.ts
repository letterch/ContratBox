/**
 * Pipeline OCR : extrait le texte des PDF et images.
 * - PDF avec texte : extraction directe (pdf-parse).
 * - PDF scanné / images : OCR (MVP : on retourne une chaîne vide et on le note pour plus tard avec Tesseract ou un service cloud).
 */

// pdf-parse est CommonJS ; import dynamique en ESM
async function loadPdfParse() {
  const pdfParse = await import("pdf-parse")
  return pdfParse.default
}

export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; hadText: boolean }> {
  try {
    const pdfParse = await loadPdfParse()
    const data = await pdfParse(buffer)
    const text = (data?.text ?? "").trim()
    return { text, hadText: text.length > 100 }
  } catch (err) {
    console.error("[ocr] extractTextFromPdf error:", err)
    return { text: "", hadText: false }
  }
}

export async function extractTextFromImage(_buffer: Buffer, _mimeType: string): Promise<{ text: string }> {
  // MVP : pas d'OCR image pour l'instant. On peut brancher Tesseract.js ou un service cloud plus tard.
  return { text: "" }
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<{ text: string; hadText: boolean }> {
  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer)
  }
  if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    const { text } = await extractTextFromImage(buffer, mimeType)
    return { text, hadText: text.length > 50 }
  }
  return { text: "", hadText: false }
}
