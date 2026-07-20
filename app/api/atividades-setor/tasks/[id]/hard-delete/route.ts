import { NextResponse } from "next/server"

import { canHardDeleteTask } from "@/lib/atividades-setor/permissions"
import { requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    if (!canHardDeleteTask(user)) {
      return NextResponse.json({ error: "Apenas administradores podem excluir definitivamente" }, { status: 403 })
    }
    const admin = createAdminClient()

    const { error } = await admin.from("activity_tasks").delete().eq("id", id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
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
