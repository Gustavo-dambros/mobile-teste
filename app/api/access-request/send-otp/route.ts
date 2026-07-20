import { NextResponse } from "next/server"
import { z } from "zod"

import { cpfDigits } from "@/lib/administracao/format"
import {
  assertOtpSendCooldown,
  generateOtpCode,
  hashOtpCode,
  OtpSendCooldownError,
  OTP_TTL_MINUTES,
} from "@/lib/access-request/otp"
import { sendEmail } from "@/lib/email/client"
import { otpEmailHtml } from "@/lib/email/templates"
import { createAdminClient } from "@/lib/supabase/admin"

const ACCESS_REQUEST_EMAIL_DOMAIN = "@unipar.br"

// Desativado temporariamente: o Resend está em modo sandbox (remetente
// onboarding@resend.dev) e só entrega e-mails para a conta dona do Resend,
// então o código nunca chega no e-mail real do solicitante. Reativar
// assim que um domínio/remetente @unipar.br for verificado no Resend.
const OTP_VERIFICATION_ENABLED = false

const bodySchema = z.object({
  name: z.string().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine((v) => v.endsWith(ACCESS_REQUEST_EMAIL_DOMAIN), {
      message: `Use um e-mail terminado em ${ACCESS_REQUEST_EMAIL_DOMAIN}`,
    }),
  phone: z.string().min(8),
  sector: z.string().min(1),
  cpf: z.string().min(11),
})

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json())
    const cpfOnlyDigits = cpfDigits(body.cpf)

    const admin = createAdminClient()

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .or(`cpf.eq.${cpfOnlyDigits},email.eq.${body.email}`)
      .is("deleted_at", null)
      .maybeSingle()
    if (existingProfile) {
      return NextResponse.json(
        { error: "Já existe um usuário ativo com este e-mail ou CPF" },
        { status: 409 }
      )
    }

    const { data: existingRequest } = await admin
      .from("access_requests")
      .select("id")
      .eq("cpf", cpfOnlyDigits)
      .eq("status", "PENDING")
      .maybeSingle()
    if (existingRequest) {
      return NextResponse.json(
        { error: "Já existe uma solicitação pendente para este CPF" },
        { status: 409 }
      )
    }

    if (!OTP_VERIFICATION_ENABLED) {
      const { error: insertError } = await admin.from("access_requests").insert({
        name: body.name,
        email: body.email,
        phone: body.phone,
        sector: body.sector,
        cpf: cpfOnlyDigits,
        status: "PENDING",
      })
      if (insertError) throw new Error(insertError.message)

      return NextResponse.json({ ok: true, skipped: true })
    }

    await assertOtpSendCooldown(admin, "access_request_otps", { email: body.email })

    const code = generateOtpCode()
    const { data: otp, error } = await admin
      .from("access_request_otps")
      .insert({
        email: body.email,
        code_hash: hashOtpCode(code),
        payload: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          sector: body.sector,
          cpf: cpfOnlyDigits,
        },
        expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
      })
      .select("id")
      .single()
    if (error || !otp) throw new Error(error?.message ?? "Não foi possível gerar o código")

    await sendEmail({
      to: body.email,
      subject: "Código de verificação — Unipar-Cascavel",
      html: otpEmailHtml(code, OTP_TTL_MINUTES),
    })

    return NextResponse.json({ otpId: otp.id })
  } catch (error) {
    if (error instanceof OtpSendCooldownError) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "Dados inválidos"
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
