/**
 * Matching assuré / membre à partir du texte OCR ou d'un nom extrait.
 */

export type MemberCandidate = {
  id: string
  firstName: string
  lastName?: string | null
  role?: string | null
}

export type MemberMatchResult = {
  memberId: string | null
  confidence: number
  matchedName: string | null
  isHouseholdWide: boolean
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Tente d'associer un contrat à un membre du ménage via le nom assuré
 * ou une recherche dans le texte extrait.
 */
export function matchMemberFromExtraction(input: {
  members: MemberCandidate[]
  insuredPersonName?: string | null
  extractedText?: string | null
}): MemberMatchResult {
  const members = input.members.filter((m) => m.firstName?.trim())
  if (members.length === 0) {
    return { memberId: null, confidence: 0, matchedName: null, isHouseholdWide: true }
  }

  const nameHint = (input.insuredPersonName ?? "").trim()
  if (nameHint) {
    const hit = scoreAgainstMembers(nameHint, members)
    if (hit && hit.score >= 0.7) {
      return {
        memberId: hit.member.id,
        confidence: hit.score,
        matchedName: `${hit.member.firstName}${hit.member.lastName ? ` ${hit.member.lastName}` : ""}`,
        isHouseholdWide: false,
      }
    }
  }

  const text = normalize(input.extractedText ?? "")
  if (!text) {
    return { memberId: null, confidence: 0, matchedName: null, isHouseholdWide: true }
  }

  let best: { member: MemberCandidate; score: number } | null = null
  for (const m of members) {
    const full = normalize(`${m.firstName} ${m.lastName ?? ""}`)
    const first = normalize(m.firstName)
    let score = 0
    if (full.length > 3 && text.includes(full)) score = 0.95
    else if (first.length >= 3 && new RegExp(`\\b${escapeRegex(first)}\\b`).test(text)) score = 0.65
    if (score > 0 && (!best || score > best.score)) best = { member: m, score }
  }

  if (best && best.score >= 0.65) {
    // Plusieurs membres matchés au même score → ménage entier
    const ties = members.filter((m) => {
      const full = normalize(`${m.firstName} ${m.lastName ?? ""}`)
      const first = normalize(m.firstName)
      if (full.length > 3 && text.includes(full)) return true
      if (first.length >= 3 && new RegExp(`\\b${escapeRegex(first)}\\b`).test(text)) return true
      return false
    })
    if (ties.length > 1 && best.score < 0.9) {
      return { memberId: null, confidence: 0.4, matchedName: null, isHouseholdWide: true }
    }
    return {
      memberId: best.member.id,
      confidence: best.score,
      matchedName: `${best.member.firstName}${best.member.lastName ? ` ${best.member.lastName}` : ""}`,
      isHouseholdWide: false,
    }
  }

  return { memberId: null, confidence: 0.2, matchedName: null, isHouseholdWide: true }
}

function scoreAgainstMembers(nameHint: string, members: MemberCandidate[]) {
  const hint = normalize(nameHint)
  let best: { member: MemberCandidate; score: number } | null = null
  for (const m of members) {
    const full = normalize(`${m.firstName} ${m.lastName ?? ""}`)
    const first = normalize(m.firstName)
    let score = 0
    if (hint === full) score = 1
    else if (full.includes(hint) || hint.includes(full)) score = 0.9
    else if (hint.includes(first) && first.length >= 3) score = 0.75
    if (score > 0 && (!best || score > best.score)) best = { member: m, score }
  }
  return best
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
