import { NextResponse } from "next/server"
import { z } from "zod"

import { canCommentOnTask } from "@/lib/atividades-setor/permissions"
import { CHECKLIST_SELECT, mapChecklistRow, requireUser } from "@/lib/atividades-setor/server"
import type { SessionUser } from "@/lib/session"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireChecklistAccess(admin: ReturnType<typeof createAdminClient>, user: SessionUser, taskId: string) {
  const { data: task } = await admin
    .from("activity_tasks")
    .select("sector, creator_id, assignee_id, watcher_ids")
    .eq("id", taskId)
    .single()
  if (!task) return { ok: false as const, status: 404, error: "Tarefa não encontrada" }
  if (
    !canCommentOnTask(user, {
      sector: task.sector,
      creatorId: task.creator_id,
      assigneeId: task.assignee_id,
      watcherIds: task.watcher_ids ?? [],
    })
  ) {
    return { ok: false as const, status: 403, error: "Você não tem permissão para editar o checklist" }
  }
  return { ok: true as const }
}

const patchSchema = z.object({
  done: z.boolean().optional(),
  text: z.string().min(1).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, itemId } = await params
    const body = patchSchema.parse(await request.json())
    const admin = createAdminClient()

    const access = await requireChecklistAccess(admin, user, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const changes: Record<string, unknown> = {}
    if (body.text !== undefined) changes.text = body.text
    if (body.done !== undefined) {
      changes.done = body.done
      changes.done_at = body.done ? new Date().toISOString() : null
      changes.done_by_id = body.done ? user.id : null
    }
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 })
    }

    const { data: item, error } = await admin
      .from("activity_task_checklist_items")
      .update(changes)
      .eq("id", itemId)
      .eq("task_id", id)
      .select(CHECKLIST_SELECT)
      .single()
    if (error || !item) throw new Error(error?.message ?? "Não foi possível atualizar o item")

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, itemId } = await params
    const admin = createAdminClient()

    const access = await requireChecklistAccess(admin, user, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { error } = await admin
      .from("activity_task_checklist_items")
      .delete()
      .eq("id", itemId)
      .eq("task_id", id)
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
