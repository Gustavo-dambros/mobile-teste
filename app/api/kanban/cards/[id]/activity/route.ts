import { NextResponse } from "next/server"

import { ACTIVITY_SELECT, getCardOwner, mapActivityRow, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_ACTIVITY_ENTRIES = 500

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("kanban_card_activity")
      .select(ACTIVITY_SELECT)
      .eq("card_id", id)
      .order("created_at", { ascending: false })
      .limit(MAX_ACTIVITY_ENTRIES)
    if (error) throw new Error(error.message)

    return NextResponse.json({ activity: (data ?? []).map(mapActivityRow) })
  } catch (error) {
    if (error instanceof Error && error.name === "KanbanAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
