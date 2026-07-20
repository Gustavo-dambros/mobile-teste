import "server-only"

function baseLayout(title: string, bodyHtml: string) {
  return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="margin: 0 0 16px; font-size: 18px;">${title}</h2>
  ${bodyHtml}
  <p style="margin-top: 32px; font-size: 12px; color: #888;">Unipar-Cascavel</p>
</div>`
}

export function otpEmailHtml(code: string, ttlMinutes: number) {
  return baseLayout(
    "Código de verificação",
    `
    <p style="font-size: 14px;">Seu código de verificação Unipar-Cascavel é:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${code}</p>
    <p style="font-size: 14px; color: #555;">Válido por ${ttlMinutes} minutos. Se você não solicitou este código, ignore este e-mail.</p>
    `
  )
}
