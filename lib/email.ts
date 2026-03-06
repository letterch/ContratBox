import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const from = process.env.EMAIL_FROM ?? "ContratBox <onboarding@resend.dev>"

export async function sendMagicLinkEmail(to: string, url: string) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY manquant — envoi magic link simulé. URL:", url)
    return { ok: true }
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Connexion à ContratBox",
    html: `
      <p>Cliquez sur le lien ci-dessous pour vous connecter à ContratBox :</p>
      <p><a href="${url}" style="color: #4f46e5;">${url}</a></p>
      <p>Ce lien expire dans 15 minutes.</p>
      <p>— L'équipe ContratBox</p>
    `,
  })
  if (error) throw new Error(`Envoi email échoué: ${error.message}`)
  return { ok: true }
}
