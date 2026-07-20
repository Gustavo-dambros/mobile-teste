import { NextResponse } from "next/server"
import { z } from "zod"

import { hashOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/access-request/otp"
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
      .from("access_request_otps")
      .select("*")
      .eq("id", otpId)
      .single()
    if (error || !otp) {
      return NextResponse.json({ error: "Código não encontrado. Solicite um novo." }, { status: 404 })
    }

    if (new Date(otp.expires_at) < new Date()) {
      await admin.from("access_request_otps").delete().eq("id", otpId)
      return NextResponse.json({ error: "Código expirado. Solicite um novo." }, { status: 400 })
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await admin.from("access_request_otps").delete().eq("id", otpId)
      return NextResponse.json(
        { error: "Número máximo de tentativas excedido. Solicite um novo código." },
        { status: 429 }
      )
    }

    if (otp.code_hash !== hashOtpCode(code)) {
      await admin
        .from("access_request_otps")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otpId)
      return NextResponse.json({ error: "Código inválido" }, { status: 400 })
    }

    const payload = otp.payload as {
      name: string
      email: string
      phone: string
      sector: string
      cpf: string
    }

    const { error: insertError } = await admin.from("access_requests").insert({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      sector: payload.sector,
      cpf: payload.cpf,
      status: "PENDING",
    })
    if (insertError) throw new Error(insertError.message)

    await admin.from("access_request_otps").delete().eq("id", otpId)

    return NextResponse.json({ ok: true })
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
