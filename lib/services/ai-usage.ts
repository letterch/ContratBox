import { prisma } from "@/lib/db"

/**
 * Suivi du quota mensuel de questions à l'assistant IA.
 *
 * Stratégie : un compteur agrégé par (userId, monthStart) — `monthStart` est le 1er
 * du mois UTC en colonne `date`. Cela évite des inserts par question et reste simple à
 * lire/écrire.
 */

/** Premier jour du mois courant en UTC (00:00 UTC), arrondi à la journée. */
export function getCurrentMonthStartUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export type AiUsageSnapshot = {
  monthStart: Date
  questionsCount: number
}

/** Récupère (ou implicite zéro) l'usage du mois courant pour un utilisateur. */
export async function getCurrentMonthAiUsage(userId: string): Promise<AiUsageSnapshot> {
  const monthStart = getCurrentMonthStartUtc()
  const row = await prisma.aiUsageMonth.findUnique({
    where: { userId_monthStart: { userId, monthStart } },
    select: { questionsCount: true, monthStart: true },
  })
  if (!row) {
    return { monthStart, questionsCount: 0 }
  }
  return { monthStart: row.monthStart, questionsCount: row.questionsCount }
}

/**
 * Incrémente atomiquement le compteur mensuel. Crée la ligne si absente.
 * Retourne le nouveau total sur le mois.
 */
export async function incrementAiUsage(userId: string, delta = 1): Promise<number> {
  const monthStart = getCurrentMonthStartUtc()
  const row = await prisma.aiUsageMonth.upsert({
    where: { userId_monthStart: { userId, monthStart } },
    create: {
      userId,
      monthStart,
      questionsCount: delta,
    },
    update: {
      questionsCount: { increment: delta },
    },
    select: { questionsCount: true },
  })
  return row.questionsCount
}
