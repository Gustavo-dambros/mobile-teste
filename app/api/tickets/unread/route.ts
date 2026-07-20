import { NextResponse } from "next/server"

import { requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data, error } = await admin.rpc("ticket_unread_counts", { p_user_id: user.id })
    if (error) throw new Error(error.message)

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      counts[row.ticket_id] = Number(row.unread_count)
    }

    return NextResponse.json({ counts })
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
