import "server-only"

export function toWhatsAppNumber(phoneDigits: string) {
  const digits = phoneDigits.replace(/\D/g, "")
  return digits.startsWith("55") ? digits : `55${digits}`
}

export async function sendWhatsAppText(phoneDigits: string, text: string) {
  const url = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!url || !apiKey || !instance) {
    throw new Error(
      "Evolution API não configurada — preencha EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE no .env.local"
    )
  }

  const response = await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: phoneDigits,
      text,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Falha ao enviar WhatsApp (${response.status}): ${body}`)
  }
}
