/**
 * Routage OpenRouter : chaîne de modèles (failover) ou routage auto.
 * @see https://openrouter.ai/docs/guides/routing/model-fallbacks
 */

export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"

const DEFAULT_PRIMARY = "anthropic/claude-3.5-sonnet"
/**
 * Secours après le Sonnet (sans le reprendre dans `models`).
 * Slugs stables sur OpenRouter ; ajoutez Gemini etc. via OPENROUTER_MODEL_FALLBACKS si besoin.
 */
const DEFAULT_FALLBACKS = ["anthropic/claude-3.5-haiku", "openai/gpt-4o-mini"] as const

export type OpenRouterChatMessage = { role: string; content: string }

export type OpenRouterChatBodyOptions = {
  messages: OpenRouterChatMessage[]
  max_tokens?: number
  temperature?: number
}

function truthyAuto(v: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((v ?? "").toLowerCase().trim())
}

/** Retire guillemets / espaces (copier-coller depuis Railway ou .env). */
function cleanModelId(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, "").trim()
}

function parseFallbackSlugs(): string[] {
  const raw = process.env.OPENROUTER_MODEL_FALLBACKS
  if (raw === "") return []
  if (raw == null || raw.trim() === "") {
    return [...DEFAULT_FALLBACKS]
  }
  return raw
    .split(/[\n,]+/)
    .map((s) => cleanModelId(s))
    .filter(Boolean)
}

/** Chaîne unique : principal puis secours (sans doublons). */
export function getOpenRouterModelChain(): string[] {
  const primary = cleanModelId(process.env.OPENROUTER_MODEL ?? DEFAULT_PRIMARY) || DEFAULT_PRIMARY
  const rest = parseFallbackSlugs().filter((m) => m !== primary)
  const out: string[] = []
  for (const m of [primary, ...rest]) {
    if (m && !out.includes(m)) out.push(m)
  }
  return out
}

/**
 * Corps JSON pour POST /v1/chat/completions.
 * - Failover : `model` = principal, `models` = **uniquement** les secours (schéma OpenAI SDK / OpenRouter).
 *   Un seul grand tableau `models` sans `model` peut provoquer une erreur 400 selon la validation.
 * - Si `OPENROUTER_USE_AUTO=true` : `model: openrouter/auto`.
 */
export function buildOpenRouterChatCompletionBody(options: OpenRouterChatBodyOptions): Record<string, unknown> {
  const { messages, max_tokens, temperature } = options

  if (truthyAuto(process.env.OPENROUTER_USE_AUTO)) {
    return {
      model: "openrouter/auto",
      messages,
      ...(max_tokens != null ? { max_tokens } : {}),
      ...(temperature != null ? { temperature } : {}),
    }
  }

  const chain = getOpenRouterModelChain()
  const primary = chain[0] ?? DEFAULT_PRIMARY
  const fallbacks = chain.slice(1)

  if (fallbacks.length === 0) {
    return {
      model: primary,
      messages,
      ...(max_tokens != null ? { max_tokens } : {}),
      ...(temperature != null ? { temperature } : {}),
    }
  }

  return {
    model: primary,
    models: fallbacks,
    messages,
    ...(max_tokens != null ? { max_tokens } : {}),
    ...(temperature != null ? { temperature } : {}),
  }
}
