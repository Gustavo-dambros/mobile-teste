import { NextResponse } from "next/server"
import { z } from "zod"

import { CARD_SELECT, getCardOwner, logCardActivity, mapCardRow, requireUser } from "@/lib/kanban/server"
import { needsRebalance, positionBetween, rebalancePositions } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  toColumnId: z.string().uuid(),
  beforeId: z.string().uuid().nullable(),
  afterId: z.string().uuid().nullable(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { toColumnId, beforeId, afterId } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const { data: targetColumn, error: columnError } = await admin
      .from("kanban_columns")
      .select("id, board_id, title, is_done_column")
      .eq("id", toColumnId)
      .single()
    if (columnError || !targetColumn || targetColumn.board_id !== owner.boardId) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    const { data: siblingRows, error: siblingsError } = await admin
      .from("kanban_cards")
      .select("id, position")
      .eq("column_id", toColumnId)
      .neq("id", id)
      .is("archived_at", null)
      .order("position")
    if (siblingsError) throw new Error(siblingsError.message)

    const siblings = siblingRows ?? []
    const beforePos = beforeId ? (siblings.find((c) => c.id === beforeId)?.position ?? null) : null
    const afterPos = afterId ? (siblings.find((c) => c.id === afterId)?.position ?? null) : null

    if (needsRebalance(beforePos, afterPos)) {
      const rebalanced = rebalancePositions(siblings)
      for (const c of rebalanced) {
        const { error } = await admin.from("kanban_cards").update({ position: c.position }).eq("id", c.id)
        if (error) throw new Error(error.message)
      }
    }

    const { data: current, error: currentError } = await admin
      .from("kanban_cards")
      .select("completed_at")
      .eq("id", id)
      .single()
    if (currentError || !current) throw new Error(currentError?.message ?? "Atividade não encontrada")

    const changes: Record<string, unknown> = {
      column_id: toColumnId,
      position: positionBetween(beforePos, afterPos),
      updated_at: new Date().toISOString(),
    }
    if (owner.columnId !== toColumnId && targetColumn.is_done_column && !current.completed_at) {
      changes.completed_at = new Date().toISOString()
    }

    const { data: updated, error } = await admin
      .from("kanban_cards")
      .update(changes)
      .eq("id", id)
      .select(CARD_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível mover a atividade")

    if (owner.columnId !== toColumnId) {
      const { data: fromColumn } = await admin
        .from("kanban_columns")
        .select("title")
        .eq("id", owner.columnId)
        .maybeSingle()
      await logCardActivity(admin, {
        cardId: id,
        userId: user.id,
        action: "moved_column",
        oldValue: fromColumn?.title,
        newValue: targetColumn.title,
      })
    }

    return NextResponse.json({ card: mapCardRow(updated) })
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
