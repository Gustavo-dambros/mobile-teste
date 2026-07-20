import { NextResponse } from "next/server"
import { z } from "zod"

import { hashOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/access-request/otp"
import { sendWhatsAppText, toWhatsAppNumber } from "@/lib/evolution/client"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  otpId: z.string(),
  code: z.string().length(6),
})

export async function POST(request: Request) {
  try {
    const { otpId, code } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: otp, error } = await admin
      .from("account_recovery_otps")
      .select("*")
      .eq("id", otpId)
      .single()
    if (error || !otp) {
      return NextResponse.json({ error: "Código não encontrado. Solicite um novo." }, { status: 404 })
    }

    if (new Date(otp.expires_at) < new Date()) {
      await admin.from("account_recovery_otps").delete().eq("id", otpId)
      return NextResponse.json({ error: "Código expirado. Solicite um novo." }, { status: 400 })
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await admin.from("account_recovery_otps").delete().eq("id", otpId)
      return NextResponse.json(
        { error: "Número máximo de tentativas excedido. Solicite um novo código." },
        { status: 429 }
      )
    }

    if (otp.code_hash !== hashOtpCode(code)) {
      await admin
        .from("account_recovery_otps")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otpId)
      return NextResponse.json({ error: "Código inválido" }, { status: 400 })
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, name, email, cpf")
      .eq("id", otp.profile_id)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const password = profile.cpf
    const { error: authError } = await admin.auth.admin.updateUserById(profile.id, {
      password,
    })
    if (authError) throw new Error(authError.message)

    await admin.from("account_recovery_otps").delete().eq("id", otpId)

    let notified = true
    try {
      await sendWhatsAppText(
        toWhatsAppNumber(otp.phone),
        `Olá, ${profile.name}! 🔐\n\nSua conta no sistema Unipar-Cascavel foi recuperada.\n\nE-mail: ${profile.email}\nSenha: ${password} (seu CPF, somente números)\n\nJá pode acessar o sistema.`
      )
    } catch {
      notified = false
    }

    return NextResponse.json({ ok: true, notified })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
