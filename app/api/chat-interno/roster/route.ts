import { NextResponse } from "next/server"

import { requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("profiles")
      .select("id, name, sector, email, phone")
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .neq("id", user.id)
      .order("name")
    if (error) throw new Error(error.message)

    return NextResponse.json({ members: data ?? [] })
  } catch (error) {
    if (error instanceof Error && error.name === "ChatAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
