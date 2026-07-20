import { NextResponse } from "next/server"
import { z } from "zod"

import { canCommentOnTask } from "@/lib/atividades-setor/permissions"
import {
  addHistory,
  canAccessTask,
  COMMENT_SELECT,
  mapCommentRow,
  mapTaskRow,
  notify,
  requireUser,
  TASK_SELECT,
} from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  text: z.string().min(1),
  parentId: z.string().optional(),
  mentionedUserIds: z.array(z.string()).default([]),
  attachments: z.array(z.any()).default([]),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    if (!(await canAccessTask(user, id))) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }
    const { data, error } = await admin
      .from("activity_task_comments")
      .select(COMMENT_SELECT)
      .eq("task_id", id)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({ comments: (data ?? []).map(mapCommentRow) })
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const input = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: task } = await admin
      .from("activity_tasks")
      .select("sector, creator_id, assignee_id, watcher_ids, title, comment_count")
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
      return NextResponse.json({ error: "Você não tem permissão para comentar nesta tarefa" }, { status: 403 })
    }

    const { data: comment, error } = await admin
      .from("activity_task_comments")
      .insert({
        task_id: id,
        author_id: user.id,
        text: input.text,
        parent_id: input.parentId,
        mentioned_user_ids: input.mentionedUserIds,
        attachments: input.attachments,
      })
      .select(COMMENT_SELECT)
      .single()
    if (error || !comment) throw new Error(error?.message ?? "Não foi possível comentar")

    // Recomputed from the real row count rather than `task.comment_count + 1`
    // (a value read before this insert) — two comments posted concurrently
    // would otherwise both increment from the same stale number and undercount.
    const { count: realCommentCount } = await admin
      .from("activity_task_comments")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id)
    const { data: updatedTask } = await admin
      .from("activity_tasks")
      .update({ comment_count: realCommentCount ?? task.comment_count + 1 })
      .eq("id", id)
      .select(TASK_SELECT)
      .single()

    await addHistory(admin, { entityType: "task", entityId: id, actorId: user.id, action: "comment_added" })

    const mentionNotifications = input.mentionedUserIds
      .filter((uid) => uid !== user.id)
      .map((uid) => ({
        type: "mention" as const,
        recipientUserId: uid,
        relatedType: "task" as const,
        relatedId: id,
        title: "Você foi mencionado",
        message: `${user.name} mencionou você em "${task.title}"`,
      }))
    const otherRecipients = new Set([task.creator_id, task.assignee_id, ...(task.watcher_ids ?? [])])
    otherRecipients.delete(user.id)
    for (const uid of input.mentionedUserIds) otherRecipients.delete(uid)
    const commentNotifications = Array.from(otherRecipients).map((uid) => ({
      type: "comment_received" as const,
      recipientUserId: uid,
      relatedType: "task" as const,
      relatedId: id,
      title: "Novo comentário",
      message: `${user.name} comentou em "${task.title}"`,
    }))
    await notify(admin, [...mentionNotifications, ...commentNotifications])

    return NextResponse.json({
      comment: mapCommentRow(comment),
      task: updatedTask ? mapTaskRow(updatedTask) : undefined,
    })
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
