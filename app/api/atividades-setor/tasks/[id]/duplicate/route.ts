import { NextResponse } from "next/server"

import { canEditTask } from "@/lib/atividades-setor/permissions"
import { addHistory, mapTaskRow, requireUser, TASK_SELECT } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertActiveProfile } from "@/lib/supabase/active-profile"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: current } = await admin.from("activity_tasks").select(TASK_SELECT).eq("id", id).single()
    if (!current) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    if (!canEditTask(user, { creatorId: current.creator_id })) {
      return NextResponse.json({ error: "Você não tem permissão para duplicar esta tarefa" }, { status: 403 })
    }

    // The original assignee may have since been deleted — duplicating shouldn't
    // resurrect them, just leave the copy unassigned instead of failing outright.
    let assigneeId: string | null = current.assignee_id
    if (assigneeId) {
      try {
        await assertActiveProfile(admin, assigneeId)
      } catch {
        assigneeId = null
      }
    }

    const { data: task, error } = await admin
      .from("activity_tasks")
      .insert({
        title: `${current.title} (cópia)`,
        description: current.description,
        sector: current.sector,
        creator_id: user.id,
        assignee_id: assigneeId,
        watcher_ids: current.watcher_ids,
        activity_id: current.activity_id,
        start_date: current.start_date,
        due_date: current.due_date,
        due_time: current.due_time,
        status: "pendente",
        priority: current.priority,
        is_priority: current.is_priority,
        category: current.category,
        tags: current.tags,
        recurrence: current.recurrence,
        attachments: [],
      })
      .select(TASK_SELECT)
      .single()
    if (error || !task) throw new Error(error?.message ?? "Não foi possível duplicar a tarefa")

    await addHistory(admin, { entityType: "task", entityId: task.id, actorId: user.id, action: "task_created" })

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
