import sharp from "sharp"

/** Prépare une image pour Tesseract (contraste / niveaux de gris). */
export async function preprocessImageForOcr(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer).greyscale().normalize({ lower: 2, upper: 98 }).png().toBuffer()
  } catch {
    return imageBuffer
  }
}
