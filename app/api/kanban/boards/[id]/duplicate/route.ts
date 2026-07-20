import { NextResponse } from "next/server"

import {
  BOARD_SELECT,
  CARD_SELECT,
  COLUMN_SELECT,
  mapBoardRow,
  requireUser,
} from "@/lib/kanban/server"
import { nextPosition } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: board, error: boardError } = await admin
      .from("kanban_boards")
      .select(BOARD_SELECT)
      .eq("id", id)
      .single()
    if (boardError || !board || board.user_id !== user.id) {
      return NextResponse.json({ error: "Quadro não encontrado" }, { status: 404 })
    }

    const { data: userBoards, error: userBoardsError } = await admin
      .from("kanban_boards")
      .select("id, position")
      .eq("user_id", user.id)
    if (userBoardsError) throw new Error(userBoardsError.message)

    const { data: newBoard, error: newBoardError } = await admin
      .from("kanban_boards")
      .insert({
        user_id: user.id,
        title: `${board.title} (cópia)`,
        description: board.description,
        background_type: board.background_type,
        background_value: board.background_value,
        is_default: false,
        position: nextPosition(userBoards ?? []),
      })
      .select(BOARD_SELECT)
      .single()
    if (newBoardError || !newBoard) throw new Error(newBoardError?.message ?? "Não foi possível duplicar o quadro")

    const { data: sourceColumns, error: columnsError } = await admin
      .from("kanban_columns")
      .select(COLUMN_SELECT)
      .eq("board_id", id)
      .is("archived_at", null)
      .order("position")
    if (columnsError) throw new Error(columnsError.message)

    const columnIdMap = new Map<string, string>()
    for (const column of sourceColumns ?? []) {
      const { data: newColumn, error: newColumnError } = await admin
        .from("kanban_columns")
        .insert({
          board_id: newBoard.id,
          title: column.title,
          position: column.position,
          color: column.color,
          is_done_column: column.is_done_column,
        })
        .select("id")
        .single()
      if (newColumnError || !newColumn) throw new Error(newColumnError?.message ?? "Não foi possível duplicar as colunas")
      columnIdMap.set(column.id, newColumn.id)
    }

    const { data: sourceCards, error: cardsError } = await admin
      .from("kanban_cards")
      .select(CARD_SELECT)
      .eq("board_id", id)
      .is("archived_at", null)
    if (cardsError) throw new Error(cardsError.message)

    const newCards = (sourceCards ?? [])
      .filter((c) => columnIdMap.has(c.column_id))
      .map((c) => ({
        board_id: newBoard.id,
        column_id: columnIdMap.get(c.column_id)!,
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
    if (newCards.length > 0) {
      const { error: newCardsError } = await admin.from("kanban_cards").insert(newCards)
      if (newCardsError) throw new Error(newCardsError.message)
    }

    return NextResponse.json({ board: mapBoardRow(newBoard) })
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
