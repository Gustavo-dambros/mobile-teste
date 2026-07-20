import { NextResponse } from "next/server"

import { canDeleteTask } from "@/lib/atividades-setor/permissions"
import { addHistory, mapTaskRow, requireUser, TASK_SELECT } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: current } = await admin.from("activity_tasks").select("creator_id").eq("id", id).single()
    if (!current) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    if (!canDeleteTask(user, { creatorId: current.creator_id })) {
      return NextResponse.json({ error: "Você não tem permissão para excluir esta tarefa" }, { status: 403 })
    }

    const { data: task, error } = await admin
      .from("activity_tasks")
      .update({ deleted_at: new Date().toISOString(), deleted_by_id: user.id })
      .eq("id", id)
      .select(TASK_SELECT)
      .single()
    if (error || !task) throw new Error(error?.message ?? "Não foi possível excluir a tarefa")

    await addHistory(admin, { entityType: "task", entityId: id, actorId: user.id, action: "task_deleted" })

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
