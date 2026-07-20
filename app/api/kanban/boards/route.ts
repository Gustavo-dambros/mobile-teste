import { NextResponse } from "next/server"
import { z } from "zod"

import {
  BOARD_SELECT,
  CARD_SELECT,
  COLUMN_SELECT,
  LABEL_SELECT,
  getCardStats,
  mapBoardRow,
  mapCardRow,
  mapColumnRow,
  mapLabelRow,
  requireUser,
} from "@/lib/kanban/server"
import { nextPosition } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

// Refetched in full on every 30s poll (lib/kanban/store.tsx) — active cards
// are never capped (archived ones still need to be returned in full too, for
// the "restore" flow in archivedCardsForBoard), but this caps the
// pathological case of one account accumulating an unbounded number of cards
// over years of use.
const MAX_CARDS = 2000

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data: boardRows, error: boardsError } = await admin
      .from("kanban_boards")
      .select(BOARD_SELECT)
      .eq("user_id", user.id)
      .order("position")
    if (boardsError) throw new Error(boardsError.message)

    const boardIds = (boardRows ?? []).map((b) => b.id)

    const [columnsResult, cardsResult, labelsResult] = await Promise.all([
      boardIds.length > 0
        ? admin.from("kanban_columns").select(COLUMN_SELECT).in("board_id", boardIds).order("position")
        : Promise.resolve({ data: [], error: null }),
      boardIds.length > 0
        ? admin.from("kanban_cards").select(CARD_SELECT).in("board_id", boardIds).order("position").limit(MAX_CARDS)
        : Promise.resolve({ data: [], error: null }),
      admin.from("kanban_labels").select(LABEL_SELECT).eq("user_id", user.id).order("created_at"),
    ])
    if (columnsResult.error) throw new Error(columnsResult.error.message)
    if (cardsResult.error) throw new Error(cardsResult.error.message)
    if (labelsResult.error) throw new Error(labelsResult.error.message)

    const cardIds = (cardsResult.data ?? []).map((c) => c.id)
    const cardStats = await getCardStats(admin, cardIds)

    return NextResponse.json({
      boards: (boardRows ?? []).map(mapBoardRow),
      columns: (columnsResult.data ?? []).map(mapColumnRow),
      cards: (cardsResult.data ?? []).map(mapCardRow),
      labels: (labelsResult.data ?? []).map(mapLabelRow),
      cardStats,
    })
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

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  backgroundValue: z.string().min(1),
  isDefault: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: userBoards, error: userBoardsError } = await admin
      .from("kanban_boards")
      .select("id, position, is_default")
      .eq("user_id", user.id)
    if (userBoardsError) throw new Error(userBoardsError.message)

    const shouldBeDefault = !!body.isDefault || (userBoards ?? []).length === 0

    if (shouldBeDefault) {
      const defaultIds = (userBoards ?? []).filter((b) => b.is_default).map((b) => b.id)
      if (defaultIds.length > 0) {
        const { error: unsetError } = await admin
          .from("kanban_boards")
          .update({ is_default: false })
          .in("id", defaultIds)
        if (unsetError) throw new Error(unsetError.message)
      }
    }

    const { data: created, error } = await admin
      .from("kanban_boards")
      .insert({
        user_id: user.id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        background_type: "color",
        background_value: body.backgroundValue,
        is_default: shouldBeDefault,
        position: nextPosition(userBoards ?? []),
      })
      .select(BOARD_SELECT)
      .single()
    if (error || !created) throw new Error(error?.message ?? "Não foi possível criar o quadro")

    return NextResponse.json({ board: mapBoardRow(created) })
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
