import { NextResponse } from "next/server"
import { z } from "zod"

import {
  assertOtpSendCooldown,
  generateOtpCode,
  hashOtpCode,
  OtpSendCooldownError,
  OTP_TTL_MINUTES,
} from "@/lib/access-request/otp"
import { sendWhatsAppText, toWhatsAppNumber } from "@/lib/evolution/client"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  email: z.string().email(),
  sector: z.string().min(1),
  phone: z.string().min(8),
})

const GENERIC_ERROR = "Dados não conferem. Verifique e-mail, setor e telefone informados."

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json())
    const phoneDigits = body.phone.replace(/\D/g, "")

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from("profiles")
      .select("id, phone, sector, status")
      .eq("email", body.email)
      .is("deleted_at", null)
      .maybeSingle()

    if (
      !profile ||
      profile.status !== "ACTIVE" ||
      profile.sector !== body.sector ||
      (profile.phone ?? "").replace(/\D/g, "") !== phoneDigits
    ) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    await assertOtpSendCooldown(admin, "account_recovery_otps", { profile_id: profile.id })

    const code = generateOtpCode()
    const { data: otp, error } = await admin
      .from("account_recovery_otps")
      .insert({
        profile_id: profile.id,
        phone: phoneDigits,
        code_hash: hashOtpCode(code),
        expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
      })
      .select("id")
      .single()
    if (error || !otp) throw new Error(error?.message ?? "Não foi possível gerar o código")

    try {
      await sendWhatsAppText(
        toWhatsAppNumber(phoneDigits),
        `Seu código de recuperação de conta Unipar-Cascavel é: ${code}\nVálido por ${OTP_TTL_MINUTES} minutos.`
      )
    } catch {
      await admin.from("account_recovery_otps").delete().eq("id", otp.id)
      return NextResponse.json(
        { error: "Não foi possível enviar o código pelo WhatsApp. Tente novamente em instantes." },
        { status: 502 }
      )
    }

    return NextResponse.json({ otpId: otp.id })
  } catch (error) {
    if (error instanceof OtpSendCooldownError) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
