import { NextResponse } from "next/server"

import { canAccessTicket, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    if (!(await canAccessTicket(user, id))) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }

    const { error } = await admin
      .from("ticket_read_state")
      .upsert({ user_id: user.id, ticket_id: id, last_seen_at: new Date().toISOString() })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
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
