import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/db"

/**
 * Génère et persiste un token d'email entrant pour un utilisateur s'il n'en possède pas.
 * Le token est utilisé pour reconnaître l'utilisateur dans une adresse `factures+<token>@…`.
 */
export async function ensureInboundEmailToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inboundEmailToken: true },
  })
  if (user?.inboundEmailToken) return user.inboundEmailToken

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = randomBytes(8).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "")
    if (token.length < 6) continue
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { inboundEmailToken: token },
      })
      return token
    } catch (err) {
      // Collision unique : retente.
      if (attempt === 4) throw err
    }
  }
  throw new Error("Impossible de générer un token email entrant")
}

export function buildInboundEmailAddress(token: string): string {
  const domain = process.env.INBOUND_EMAIL_DOMAIN || "bills.contratbox.ch"
  return `factures+${token}@${domain}`
}

/** Trouve un utilisateur depuis un email entrant (`factures+<token>@…`). */
export async function findUserByInboundEmail(toAddress: string) {
  const m = toAddress.toLowerCase().match(/factures\+([a-z0-9]+)@/)
  if (!m) return null
  const token = m[1]
  return prisma.user.findUnique({
    where: { inboundEmailToken: token },
    select: { id: true },
  })
}
