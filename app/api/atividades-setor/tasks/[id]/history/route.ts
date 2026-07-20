import { NextResponse } from "next/server"

import { canAccessTask, HISTORY_SELECT, mapHistoryRow, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    if (!(await canAccessTask(user, id))) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }
    const { data, error } = await admin
      .from("activity_history")
      .select(HISTORY_SELECT)
      .eq("entity_type", "task")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)

    return NextResponse.json({ history: (data ?? []).map(mapHistoryRow) })
  } catch (error) {
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
