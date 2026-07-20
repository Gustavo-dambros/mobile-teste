import { NextResponse } from "next/server"

import { canRestoreTask } from "@/lib/atividades-setor/permissions"
import { addHistory, mapTaskRow, requireUser, TASK_SELECT } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    if (!canRestoreTask(user)) {
      return NextResponse.json({ error: "Apenas administradores podem restaurar tarefas" }, { status: 403 })
    }
    const admin = createAdminClient()

    const { data: task, error } = await admin
      .from("activity_tasks")
      .update({ archived_at: null, archived_by_id: null, deleted_at: null, deleted_by_id: null })
      .eq("id", id)
      .select(TASK_SELECT)
      .single()
    if (error || !task) throw new Error(error?.message ?? "Não foi possível restaurar a tarefa")

    await addHistory(admin, { entityType: "task", entityId: id, actorId: user.id, action: "task_restored" })

    return NextResponse.json({ task: mapTaskRow(task) })
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
