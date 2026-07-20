import { NextResponse } from "next/server"
import { z } from "zod"

import {
  COMMENT_SELECT,
  getCommentOwner,
  logCardActivity,
  mapCommentRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ content: z.string().min(1) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { content } = bodySchema.parse(await request.json())

    const owner = await getCommentOwner(id)
    if (!owner || owner.authorId !== user.id) {
      return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: comment, error } = await admin
      .from("kanban_card_comments")
      .update({ content: content.trim(), edited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(COMMENT_SELECT)
      .single()
    if (error || !comment) throw new Error(error?.message ?? "Não foi possível editar o comentário")

    await logCardActivity(admin, { cardId: owner.cardId, userId: user.id, action: "comment_edited" })

    return NextResponse.json({ comment: mapCommentRow(comment) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "KanbanAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    const owner = await getCommentOwner(id)
    if (!owner || owner.authorId !== user.id) {
      return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from("kanban_card_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw new Error(error.message)

    await logCardActivity(admin, { cardId: owner.cardId, userId: user.id, action: "comment_deleted" })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === "KanbanAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
