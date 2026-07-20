import { NextResponse } from "next/server"

import { isSystemAdmin } from "@/lib/atividades-setor/permissions"
import { addHistory, COMMENT_SELECT, mapCommentRow, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, commentId } = await params
    const admin = createAdminClient()

    const { data: current } = await admin
      .from("activity_task_comments")
      .select("author_id")
      .eq("id", commentId)
      .single()
    if (!current) return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 })
    if (current.author_id !== user.id && !isSystemAdmin(user)) {
      return NextResponse.json({ error: "Você não tem permissão para excluir este comentário" }, { status: 403 })
    }

    const { data: comment, error } = await admin
      .from("activity_task_comments")
      .update({ deleted_at: new Date().toISOString(), deleted_by_id: user.id })
      .eq("id", commentId)
      .select(COMMENT_SELECT)
      .single()
    if (error || !comment) throw new Error(error?.message ?? "Não foi possível excluir o comentário")

    await addHistory(admin, { entityType: "task", entityId: id, actorId: user.id, action: "comment_deleted" })

    return NextResponse.json({ comment: mapCommentRow(comment) })
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
