import { NextResponse } from "next/server"
import { z } from "zod"

import {
  COMMENT_SELECT,
  getCardOwner,
  logCardActivity,
  mapCommentRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("kanban_card_comments")
      .select(COMMENT_SELECT)
      .eq("card_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({ comments: (data ?? []).map(mapCommentRow) })
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

const bodySchema = z.object({ content: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { content } = bodySchema.parse(await request.json())

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: comment, error } = await admin
      .from("kanban_card_comments")
      .insert({ card_id: id, user_id: user.id, content: content.trim() })
      .select(COMMENT_SELECT)
      .single()
    if (error || !comment) throw new Error(error?.message ?? "Não foi possível comentar")

    await logCardActivity(admin, { cardId: id, userId: user.id, action: "comment_added" })

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
