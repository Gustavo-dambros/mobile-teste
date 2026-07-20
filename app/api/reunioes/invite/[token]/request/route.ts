import { NextResponse } from "next/server"
import { z } from "zod"

import { hashOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/access-request/otp"
import {
  DenyCooldownError,
  GuestJoinError,
  PasswordRateLimitError,
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
  code: z.string().length(6),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const meeting = await validateGuestJoinRequest(token, {
      email: body.email,
      password: body.password,
    })

    const { data: otp, error: otpError } = await admin
      .from("meeting_join_otps")
      .select("*")
      .eq("meeting_id", meeting.id)
      .eq("email", body.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (otpError || !otp) {
      return NextResponse.json({ error: "Código não encontrado. Solicite um novo." }, { status: 404 })
    }

    if (new Date(otp.expires_at) < new Date()) {
      await admin.from("meeting_join_otps").delete().eq("id", otp.id)
      return NextResponse.json({ error: "Código expirado. Solicite um novo." }, { status: 400 })
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await admin.from("meeting_join_otps").delete().eq("id", otp.id)
      return NextResponse.json(
        { error: "Número máximo de tentativas excedido. Solicite um novo código." },
        { status: 429 }
      )
    }

    if (otp.code_hash !== hashOtpCode(body.code)) {
      await admin
        .from("meeting_join_otps")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id)
      return NextResponse.json({ error: "Código inválido" }, { status: 400 })
    }

    // A guest can end up requesting entry twice for the same meeting (double
    // submit, two tabs, retrying after "Pedir entrada novamente") — without
    // this, each attempt inserts its own row and the host sees the same
    // person listed multiple times in the waiting room.
    await admin
      .from("meeting_waiting_guests")
      .delete()
      .eq("meeting_id", meeting.id)
      .eq("email", body.email)

    const { data: guest, error: insertError } = await admin
      .from("meeting_waiting_guests")
      .insert({ meeting_id: meeting.id, name: body.name, email: body.email })
      .select("id")
      .single()
    if (insertError || !guest) {
      throw new Error(insertError?.message ?? "Não foi possível solicitar entrada")
    }

    await admin.from("meeting_join_otps").delete().eq("id", otp.id)

    return NextResponse.json({ guestId: guest.id })
  } catch (error) {
    if (error instanceof GuestJoinError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof PasswordRateLimitError || error instanceof DenyCooldownError) {
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
