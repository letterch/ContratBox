/**
 * Envoi email pour un rappel — à brancher sur Resend / queue (hors scope MVP).
 * Ne pas utiliser comme preuve d’exécution côté utilisateur sans accusé de réception.
 */
export async function sendReminderEmail(_input: {
  reminderId: string
  toEmail: string
}): Promise<{ ok: boolean; skipped: true; reason: string }> {
  return { ok: false, skipped: true, reason: "email_non_branché" }
}

/**
 * Digest quotidien des rappels — à planifier via cron (Vercel / Railway).
 */
export async function dailyReminderDigest(_input: { householdId?: string } = {}): Promise<{
  ok: boolean
  skipped: true
  reason: string
}> {
  void _input
  return { ok: false, skipped: true, reason: "digest_non_branché" }
}
