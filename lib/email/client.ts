import "server-only"
import { Resend } from "resend"

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    throw new Error(
      "Resend não configurado — preencha RESEND_API_KEY e RESEND_FROM_EMAIL no .env.local"
    )
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`)
  }
}
