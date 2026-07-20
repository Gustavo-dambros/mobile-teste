import { NextResponse } from "next/server"
import { z } from "zod"

import { addHistory, COMMENT_SELECT, mapCommentRow, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ text: z.string().min(1) })

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, commentId } = await params
    const { text } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: current } = await admin
      .from("activity_task_comments")
      .select("author_id")
      .eq("id", commentId)
      .single()
    if (!current) return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 })
    if (current.author_id !== user.id) {
      return NextResponse.json({ error: "Você só pode editar seus próprios comentários" }, { status: 403 })
    }

    const { data: comment, error } = await admin
      .from("activity_task_comments")
      .update({ text, edited_at: new Date().toISOString() })
      .eq("id", commentId)
      .select(COMMENT_SELECT)
      .single()
    if (error || !comment) throw new Error(error?.message ?? "Não foi possível editar o comentário")

    await addHistory(admin, { entityType: "task", entityId: id, actorId: user.id, action: "comment_edited" })

    return NextResponse.json({ comment: mapCommentRow(comment) })
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
