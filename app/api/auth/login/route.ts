import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ ok: false, error: "Informe e-mail e senha" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("status, deleted_at")
    .eq("email", email)
    .maybeSingle()

  if (!profile || profile.deleted_at) {
    return NextResponse.json(
      { ok: false, error: "Não encontramos uma conta com este e-mail." },
      { status: 401 }
    )
  }
  if (profile.status !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, error: "Esta conta foi bloqueada. Entre em contato com a administração." },
      { status: 403 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ ok: false, error: "Senha incorreta" }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
