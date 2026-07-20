import { NextResponse } from "next/server"

import {
  CARD_SELECT,
  COLUMN_SELECT,
  getColumnOwner,
  mapColumnRow,
  requireUser,
} from "@/lib/kanban/server"
import { nextPosition } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const owner = await getColumnOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    const { data: column, error: columnError } = await admin
      .from("kanban_columns")
      .select(COLUMN_SELECT)
      .eq("id", id)
      .single()
    if (columnError || !column) throw new Error(columnError?.message ?? "Coluna não encontrada")

    const { data: siblings, error: siblingsError } = await admin
      .from("kanban_columns")
      .select("position")
      .eq("board_id", owner.boardId)
    if (siblingsError) throw new Error(siblingsError.message)

    const { data: newColumn, error: newColumnError } = await admin
      .from("kanban_columns")
      .insert({
        board_id: owner.boardId,
        title: `${column.title} (cópia)`,
        position: nextPosition(siblings ?? []),
        color: column.color,
        is_done_column: column.is_done_column,
      })
      .select(COLUMN_SELECT)
      .single()
    if (newColumnError || !newColumn) throw new Error(newColumnError?.message ?? "Não foi possível duplicar a coluna")

    const { data: sourceCards, error: cardsError } = await admin
      .from("kanban_cards")
      .select(CARD_SELECT)
      .eq("column_id", id)
      .is("archived_at", null)
    if (cardsError) throw new Error(cardsError.message)

    if (sourceCards && sourceCards.length > 0) {
      const newCards = sourceCards.map((c) => ({
        board_id: owner.boardId,
        column_id: newColumn.id,
        user_id: user.id,
        title: c.title,
        description: c.description,
        position: c.position,
        priority: c.priority,
        start_at: c.start_at,
        due_at: c.due_at,
        reminder_type: c.reminder_type,
        reminder_custom_minutes: c.reminder_custom_minutes,
        recurrence_type: c.recurrence_type,
        recurrence_custom_days: c.recurrence_custom_days,
        cover_type: c.cover_type,
        cover_value: c.cover_value,
        label_ids: c.label_ids,
      }))
      const { error: newCardsError } = await admin.from("kanban_cards").insert(newCards)
      if (newCardsError) throw new Error(newCardsError.message)
    }

    return NextResponse.json({ column: mapColumnRow(newColumn) })
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
