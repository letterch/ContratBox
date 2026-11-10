/**
 * Les PDF assureurs suisses (Assura, etc.) sortent souvent un mot par ligne via pdf-parse.
 * On reconstruit un texte lisible pour le LLM et les heuristiques regex.
 */
export function normalizeOcrExtractedText(raw: string): string {
  const t = (raw ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
  if (!t) return ""

  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return ""

  // Si >55% des lignes font ≤ 2 "mots", on considère un découpage mot-par-ligne.
  const shortLineRatio =
    lines.filter((l) => l.split(/\s+/).filter(Boolean).length <= 2).length / lines.length

  if (shortLineRatio >= 0.55) {
    // Rejoindre tout en espaces, puis retirer les espaces autour de la ponctuation / chiffres.
    let joined = lines.join(" ")
    joined = joined
      .replace(/\s+/g, " ")
      .replace(/\s+([.,;:!?%/])/g, "$1")
      .replace(/([(\[])\s+/g, "$1")
      .replace(/\s+([)\]])/g, "$1")
      // "13 . 20" / "13. 20" → "13.20"
      .replace(/(\d)\s*\.\s*(\d)/g, "$1.$2")
      // "2 ' 500" / "2'500" CHF suisses
      .replace(/(\d)\s*['’]\s*(\d{3})/g, "$1'$2")
      // "01 . 01 . 2024" → "01.01.2024"
      .replace(/(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/g, "$1.$2.$3")
      // "n °" → "n°"
      .replace(/\bn\s*°/gi, "n°")
      .trim()
    return joined
  }

  // Sinon : collapse espaces intra-ligne, garder les sauts de paragraphe.
  return lines
    .join("\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
