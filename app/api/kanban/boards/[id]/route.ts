import { NextResponse } from "next/server"
import { z } from "zod"

import { BOARD_SELECT, mapBoardRow, removeAttachmentFilesForCards, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  backgroundValue: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: board, error: boardError } = await admin
      .from("kanban_boards")
      .select(BOARD_SELECT)
      .eq("id", id)
      .single()
    if (boardError || !board || board.user_id !== user.id) {
      return NextResponse.json({ error: "Quadro não encontrado" }, { status: 404 })
    }

    if (body.isDefault) {
      const { error: unsetError } = await admin
        .from("kanban_boards")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", id)
      if (unsetError) throw new Error(unsetError.message)
    }

    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) changes.title = body.title.trim()
    if (body.description !== undefined) changes.description = body.description.trim() || null
    if (body.backgroundValue !== undefined) changes.background_value = body.backgroundValue
    if (body.isDefault !== undefined) changes.is_default = body.isDefault

    const { data: updated, error } = await admin
      .from("kanban_boards")
      .update(changes)
      .eq("id", id)
      .select(BOARD_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível atualizar o quadro")

    return NextResponse.json({ board: mapBoardRow(updated) })
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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: board } = await admin.from("kanban_boards").select("user_id").eq("id", id).single()
    if (!board || board.user_id !== user.id) {
      return NextResponse.json({ error: "Quadro não encontrado" }, { status: 404 })
    }

    const { data: cardsInBoard } = await admin.from("kanban_cards").select("id").eq("board_id", id)
    await removeAttachmentFilesForCards(admin, (cardsInBoard ?? []).map((c) => c.id))

    const { error } = await admin.from("kanban_boards").delete().eq("id", id)
    if (error) throw new Error(error.message)

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
