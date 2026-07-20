import { NextResponse } from "next/server"

import { requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    await requireUser()
    const sector = new URL(request.url).searchParams.get("sector")
    if (!sector) return NextResponse.json({ error: "Informe o setor" }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("profiles")
      .select("id, name, sector")
      .eq("sector", sector)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name")
    if (error) throw new Error(error.message)

    return NextResponse.json({ staff: data ?? [] })
  } catch (error) {
    if (error instanceof Error && error.name === "TicketAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
