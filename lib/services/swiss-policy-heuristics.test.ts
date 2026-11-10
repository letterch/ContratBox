import assert from "node:assert/strict"
import fs from "node:fs"
import { normalizeOcrExtractedText } from "@/lib/services/ocr-text-normalize"
import {
  extractSwissPolicyHeuristics,
  reconcileExtractionWithDocument,
} from "@/lib/services/swiss-policy-heuristics"

const pdfPath =
  "/home/ubuntu/.cursor/projects/workspace/uploads/Police_d_assurance_Assura_complementaires__Maria_2569.pdf"

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdf = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>
  const buf = fs.readFileSync(pdfPath)
  const { text } = await pdf(buf)
  const normalized = normalizeOcrExtractedText(text)
  assert.ok(normalized.toLowerCase().includes("assura"))
  assert.ok(!normalized.includes("\nAssura\n")) // words joined

  const h = extractSwissPolicyHeuristics(text)
  assert.equal(h.provider, "Assura")
  assert.equal(h.suggestedCategory, "health_supplementary")
  assert.equal(h.policyNumber, "1169444")
  assert.ok(h.insuredPersonName?.includes("Maria"))
  assert.equal(h.monthlyPremium, 35.95)
  assert.ok(h.startDate === "2024-01-01" || h.startDate === "2023-01-01")

  const reconciled = reconcileExtractionWithDocument(
    {
      provider: "Helvetia",
      monthlyPremium: 1320,
      suggestedCategory: "health_supplementary",
      startDate: "2023-01-01",
      confidenceScore: 85,
    },
    text,
    "Police d'assurance Assura complementaires Maria.pdf"
  )
  assert.equal(reconciled.provider, "Assura")
  assert.equal(reconciled.monthlyPremium, 35.95)
  assert.equal(reconciled.policyNumber, "1169444")
  assert.ok(reconciled.insuredPersonName?.toLowerCase().includes("maria"))

  console.log("swiss-policy-heuristics.test.ts OK", {
    provider: reconciled.provider,
    monthly: reconciled.monthlyPremium,
    policy: reconciled.policyNumber,
    insured: reconciled.insuredPersonName,
    start: reconciled.startDate,
    coverage: reconciled.keyCoverageSummary,
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
