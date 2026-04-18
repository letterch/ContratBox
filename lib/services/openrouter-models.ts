/**
 * Routage OpenRouter : chaîne de modèles (failover) ou routage auto.
 * @see https://openrouter.ai/docs/guides/routing/model-fallbacks
 */

export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"

const DEFAULT_PRIMARY = "anthropic/claude-3.5-sonnet"
/** Modèles économiques / disponibles en secours après le Sonnet. */
const DEFAULT_FALLBACKS = [
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash-lite-001",
  "openai/gpt-4o-mini",
] as const

export type OpenRouterChatMessage = { role: string; content: string }

export type OpenRouterChatBodyOptions = {
  messages: OpenRouterChatMessage[]
  max_tokens?: number
  temperature?: number
}

function truthyAuto(v: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((v ?? "").toLowerCase().trim())
}

function parseFallbackSlugs(): string[] {
  const raw = process.env.OPENROUTER_MODEL_FALLBACKS
  if (raw === "") return []
  if (raw == null || raw.trim() === "") {
    return [...DEFAULT_FALLBACKS]
  }
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Chaîne unique : principal puis secours (sans doublons). */
export function getOpenRouterModelChain(): string[] {
  const primary = (process.env.OPENROUTER_MODEL ?? DEFAULT_PRIMARY).trim() || DEFAULT_PRIMARY
  const rest = parseFallbackSlugs().filter((m) => m !== primary)
  const out: string[] = []
  for (const m of [primary, ...rest]) {
    if (m && !out.includes(m)) out.push(m)
  }
  return out
}

/**
 * Corps JSON pour POST /v1/chat/completions.
 * - Par défaut : `models: [principal, …]` → failover automatique OpenRouter.
 * - Si `OPENROUTER_USE_AUTO=true` : `model: openrouter/auto` (sélection par OpenRouter / NotDiamond).
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
  if (chain.length <= 1) {
    return {
      model: chain[0] ?? DEFAULT_PRIMARY,
      messages,
      ...(max_tokens != null ? { max_tokens } : {}),
      ...(temperature != null ? { temperature } : {}),
    }
  }

  return {
    models: chain,
    messages,
    ...(max_tokens != null ? { max_tokens } : {}),
    ...(temperature != null ? { temperature } : {}),
  }
}
