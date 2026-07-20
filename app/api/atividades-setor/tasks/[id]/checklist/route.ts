import { NextResponse } from "next/server"
import { z } from "zod"

import { canCommentOnTask } from "@/lib/atividades-setor/permissions"
import { CHECKLIST_SELECT, canAccessTask, mapChecklistRow, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!(await canAccessTask(user, id))) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("activity_task_checklist_items")
      .select(CHECKLIST_SELECT)
      .eq("task_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({ items: (data ?? []).map(mapChecklistRow) })
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

const bodySchema = z.object({ text: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { text } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: task } = await admin
      .from("activity_tasks")
      .select("sector, creator_id, assignee_id, watcher_ids")
      .eq("id", id)
      .single()
    if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    if (
      !canCommentOnTask(user, {
        sector: task.sector,
        creatorId: task.creator_id,
        assigneeId: task.assignee_id,
        watcherIds: task.watcher_ids ?? [],
      })
    ) {
      return NextResponse.json({ error: "Você não tem permissão para editar o checklist" }, { status: 403 })
    }

    const { count } = await admin
      .from("activity_task_checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id)

    const { data: item, error } = await admin
      .from("activity_task_checklist_items")
      .insert({ task_id: id, text, created_by_id: user.id, position: count ?? 0 })
      .select(CHECKLIST_SELECT)
      .single()
    if (error || !item) throw new Error(error?.message ?? "Não foi possível adicionar o item")

    return NextResponse.json({ item: mapChecklistRow(item) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
