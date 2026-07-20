import { NextResponse } from "next/server"

import { CARD_SELECT, getCardOwner, mapCardRow, requireUser } from "@/lib/kanban/server"
import { nextPosition } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const { data: card, error: cardError } = await admin
      .from("kanban_cards")
      .select(CARD_SELECT)
      .eq("id", id)
      .single()
    if (cardError || !card) throw new Error(cardError?.message ?? "Atividade não encontrada")

    const { data: siblings, error: siblingsError } = await admin
      .from("kanban_cards")
      .select("position")
      .eq("column_id", owner.columnId)
    if (siblingsError) throw new Error(siblingsError.message)

    const { data: created, error } = await admin
      .from("kanban_cards")
      .insert({
        board_id: owner.boardId,
        column_id: owner.columnId,
        user_id: user.id,
        title: `${card.title} (cópia)`,
        description: card.description,
        position: nextPosition(siblings ?? []),
        priority: card.priority,
        start_at: card.start_at,
        due_at: card.due_at,
        reminder_type: card.reminder_type,
        reminder_custom_minutes: card.reminder_custom_minutes,
        recurrence_type: card.recurrence_type,
        recurrence_custom_days: card.recurrence_custom_days,
        cover_type: card.cover_type,
        cover_value: card.cover_value,
        label_ids: card.label_ids,
      })
      .select(CARD_SELECT)
      .single()
    if (error || !created) throw new Error(error?.message ?? "Não foi possível duplicar a atividade")

    return NextResponse.json({ card: mapCardRow(created) })
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
