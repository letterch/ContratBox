/**
 * Génération de lettres de résiliation / litige prêtes à copier dans NextLetter.
 */

export type CancellationLetterInput = {
  provider?: string | null
  policyNumber?: string | null
  contractTitle?: string | null
  category?: string | null
  memberName?: string | null
  noticeDays?: number | null
  renewalDateIso?: string | null
  cancellationDeadlineIso?: string | null
  senderName?: string | null
  senderAddress?: string | null
  language?: "fr" | "de" | "it" | "en"
}

export function draftCancellationLetter(input: CancellationLetterInput): string {
  const lang = input.language ?? "fr"
  const provider = input.provider ?? "l'assureur"
  const policy = input.policyNumber ? `n° ${input.policyNumber}` : "concerné"
  const title = input.contractTitle ?? "contrat d'assurance"
  const member = input.memberName ?? input.senderName ?? "[Nom]"
  const deadline = input.cancellationDeadlineIso
    ? formatDateFr(input.cancellationDeadlineIso)
    : input.renewalDateIso
      ? formatDateFr(input.renewalDateIso)
      : null
  const notice = input.noticeDays != null ? `${input.noticeDays} jours` : null

  if (lang === "de") {
    return [
      `${member}`,
      input.senderAddress ?? "",
      "",
      `An: ${provider}`,
      "",
      `Betreff: Kündigung der Police ${policy} — ${title}`,
      "",
      "Sehr geehrte Damen und Herren,",
      "",
      `hiermit kündige ich die oben genannte Police fristgerecht${deadline ? ` auf den ${deadline}` : ""}.`,
      notice ? `Die vereinbarte Kündigungsfrist beträgt ${notice}.` : "",
      "",
      "Bitte bestätigen Sie mir die Kündigung schriftlich und teilen Sie mir das genaue Enddatum mit.",
      "",
      "Mit freundlichen Grüssen",
      "",
      member,
    ]
      .filter((l) => l !== undefined)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
  }

  return [
    member,
    input.senderAddress ?? "",
    "",
    `À l'attention de : ${provider}`,
    "",
    `Objet : Résiliation du contrat ${policy} — ${title}`,
    "",
    "Madame, Monsieur,",
    "",
    `Par la présente, je vous notifie la résiliation du contrat mentionné ci-dessus, dans le respect du préavis contractuel${notice ? ` (${notice})` : ""}${deadline ? `, pour le ${deadline}` : ""}.`,
    "",
    "Je vous prie de bien vouloir me confirmer par écrit la bonne réception de cette résiliation ainsi que la date exacte de fin de couverture.",
    "",
    "Dans l'attente de votre confirmation, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.",
    "",
    member,
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
}

export function draftDisputeLetter(input: {
  provider?: string | null
  invoiceNumber?: string | null
  amount?: number | null
  reason?: string | null
  senderName?: string | null
}): string {
  const provider = input.provider ?? "le prestataire"
  const inv = input.invoiceNumber ? `n° ${input.invoiceNumber}` : ""
  const amount = input.amount != null ? `CHF ${input.amount.toFixed(2)}` : ""
  const reason = input.reason?.trim() || "un différend sur le montant ou les prestations facturées"
  const sender = input.senderName ?? "[Nom]"

  return [
    sender,
    "",
    `À l'attention de : ${provider}`,
    "",
    `Objet : Contestation de facture ${inv} ${amount}`.trim(),
    "",
    "Madame, Monsieur,",
    "",
    `Je conteste la facture ${inv} ${amount ? `d'un montant de ${amount}` : ""} pour le motif suivant : ${reason}.`,
    "",
    "Je vous prie de suspendre tout prélèvement jusqu'à clarification et de me répondre par écrit sous 10 jours.",
    "",
    "Cordialement,",
    "",
    sender,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
}

function formatDateFr(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}
