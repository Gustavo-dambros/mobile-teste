import { NextResponse } from "next/server"
import { z } from "zod"

import { generateOtpCode, hashOtpCode, OTP_TTL_MINUTES } from "@/lib/access-request/otp"
import { sendEmail } from "@/lib/email/client"
import { otpEmailHtml } from "@/lib/email/templates"
import {
  DenyCooldownError,
  GuestJoinError,
  OtpSendRateLimitError,
  PasswordRateLimitError,
  assertOtpSendAllowed,
  validateGuestJoinRequest,
} from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const GUEST_EMAIL_DOMAIN = "@unipar.br"

const bodySchema = z.object({
  name: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine((v) => v.endsWith(GUEST_EMAIL_DOMAIN), {
      message: `Use um e-mail terminado em ${GUEST_EMAIL_DOMAIN}`,
    }),
  password: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = bodySchema.parse(await request.json())

    const meeting = await validateGuestJoinRequest(token, {
      email: body.email,
      password: body.password,
    })
    await assertOtpSendAllowed(meeting.id, body.email)

    const admin = createAdminClient()
    const code = generateOtpCode()
    const { error } = await admin.from("meeting_join_otps").insert({
      meeting_id: meeting.id,
      email: body.email,
      code_hash: hashOtpCode(code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    })
    if (error) throw new Error(error.message)

    await sendEmail({
      to: body.email,
      subject: "Código de verificação — Unipar-Cascavel",
      html: otpEmailHtml(code, OTP_TTL_MINUTES),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof GuestJoinError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (
      error instanceof PasswordRateLimitError ||
      error instanceof DenyCooldownError ||
      error instanceof OtpSendRateLimitError
    ) {
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
