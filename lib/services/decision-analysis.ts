import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import {
  contractDecisionAnalysisResponseSchema,
  type ContractDecisionAnalysisPayload,
} from "@/lib/schemas/contract-decision-analysis"
import { parseModelJson } from "@/lib/services/extraction"
import {
  buildOpenRouterChatCompletionBody,
  OPENROUTER_CHAT_COMPLETIONS_URL,
} from "@/lib/services/openrouter-models"
import { computePriorityScore } from "@/lib/services/recommendation-engine"

const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 60000)

function buildDecisionPrompt(input: {
  structuredSummary: string
  textSample: string
}): string {
  return `Tu es un assistant d'analyse de contrats (Suisse) pour un tableau de bord personnel.
Tu complètes des règles métier déjà calculées côté serveur : ne prétends pas que des données existent si elles ne figurent pas dans le texte ou le résumé structuré fourni.

Règles strictes :
- Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte avant/après).
- Si une information est absente ou incertaine : booleans à false, tableaux vides, estimatedImpactChfYear à 0, recommendationKind "none", nextAction court en invitant à vérifier les documents ou l'assureur.
- canCancelNow : true uniquement si le texte ou le résumé indique clairement qu'une résiliation est possible maintenant ou dans une fenêtre ouverte (sinon false).
- Aucun conseil juridique ou financier garanti : formulation prudente (suggestions, vérifications).
- hiddenRisks : formulations courtes sur exclusions ou clauses ambiguës MENTIONNÉES dans le texte.
- overpricingSignals : indices de surcoût UNIQUEMENT s'ils sont explicites dans le texte (ex. comparaison tarifaire indiquée).

Résumé structuré (champs connus de l'application) :
${input.structuredSummary}

Extrait texte du contrat (tronqué) :
${input.textSample}
`
}

function structuredSummaryFromContract(c: {
  provider: string | null
  title: string | null
  category: string | null
  premiumAmount: unknown
  premiumFrequency: string | null
  renewalDate: Date | null
  endDate: Date | null
  maturityDate: Date | null
  cancellationNoticeDays: number | null
  cancellationDeadline: Date | null
  rawExtraction: unknown
}): string {
  const raw = JSON.stringify(c.rawExtraction ?? {}, null, 0).slice(0, 4000)
  return [
    `provider: ${c.provider ?? ""}`,
    `title: ${c.title ?? ""}`,
    `category: ${c.category ?? ""}`,
    `premiumAmount: ${c.premiumAmount != null ? String(c.premiumAmount) : ""}`,
    `premiumFrequency: ${c.premiumFrequency ?? ""}`,
    `renewalDate: ${c.renewalDate ? c.renewalDate.toISOString().slice(0, 10) : ""}`,
    `endDate: ${c.endDate ? c.endDate.toISOString().slice(0, 10) : ""}`,
    `maturityDate: ${c.maturityDate ? c.maturityDate.toISOString().slice(0, 10) : ""}`,
    `cancellationNoticeDays: ${c.cancellationNoticeDays ?? ""}`,
    `cancellationDeadline: ${c.cancellationDeadline ? c.cancellationDeadline.toISOString().slice(0, 10) : ""}`,
    `rawExtraction (tronqué): ${raw}`,
  ].join("\n")
}

export type AnalyzeContractDecisionResult =
  | { ok: true; insight: ContractDecisionAnalysisPayload; priorityScore: number }
  | { ok: false; error: string; hint?: string }

export async function analyzeContractDecisionWithLlm(contractId: string, userId: string): Promise<AnalyzeContractDecisionResult> {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return { ok: false, error: "OPENROUTER_API_KEY manquant" }
  }

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, household: { ownerId: userId } },
    select: {
      id: true,
      provider: true,
      title: true,
      category: true,
      premiumAmount: true,
      premiumFrequency: true,
      renewalDate: true,
      endDate: true,
      maturityDate: true,
      cancellationNoticeDays: true,
      cancellationDeadline: true,
      rawExtraction: true,
      extractedText: true,
    },
  })
  if (!contract) return { ok: false, error: "Contrat introuvable" }

  const structuredSummary = structuredSummaryFromContract(contract)
  const textSample = (contract.extractedText ?? "").slice(0, 14_000)
  const prompt = buildDecisionPrompt({ structuredSummary, textSample })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
        "X-Title": "ContratBox Decision Analysis",
      },
      body: JSON.stringify(
        buildOpenRouterChatCompletionBody({
          temperature: 0.1,
          max_tokens: 1200,
          messages: [
            { role: "system", content: "Tu produis uniquement du JSON valide selon le schéma demandé." },
            { role: "user", content: prompt },
          ],
        })
      ),
      signal: controller.signal,
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return { ok: false, error: `OpenRouter ${res.status}`, hint: errText.slice(0, 200) }
    }
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = body.choices?.[0]?.message?.content?.trim()
    if (!content) return { ok: false, error: "Réponse modèle vide" }

    const raw = parseModelJson(content)
    const parsed = contractDecisionAnalysisResponseSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "JSON invalide", hint: parsed.error.flatten().toString().slice(0, 400) }
    }

    const daysHint = 30
    const priorityScore = computePriorityScore({
      urgency: parsed.data.urgencyLevel,
      impactChfYear: parsed.data.estimatedImpactChfYear,
      daysUntil: daysHint,
    })

    await prisma.contractDecisionInsight.upsert({
      where: { contractId: contract.id },
      create: {
        contractId: contract.id,
        estimatedImpactChfYear: parsed.data.estimatedImpactChfYear,
        riskLevel: parsed.data.riskLevel,
        nextAction: parsed.data.nextAction,
        canCancelNow: parsed.data.canCancelNow,
        priorityScore,
        urgencyLevel: parsed.data.urgencyLevel,
        recommendationKind: parsed.data.recommendationKind,
        signals: parsed.data.signals as Prisma.InputJsonValue,
      },
      update: {
        estimatedImpactChfYear: parsed.data.estimatedImpactChfYear,
        riskLevel: parsed.data.riskLevel,
        nextAction: parsed.data.nextAction,
        canCancelNow: parsed.data.canCancelNow,
        priorityScore,
        urgencyLevel: parsed.data.urgencyLevel,
        recommendationKind: parsed.data.recommendationKind,
        signals: parsed.data.signals as Prisma.InputJsonValue,
        computedAt: new Date(),
      },
    })

    return { ok: true, insight: parsed.data, priorityScore }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue"
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timeout)
  }
}
