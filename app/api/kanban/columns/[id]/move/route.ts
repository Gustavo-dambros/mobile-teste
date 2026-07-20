import { NextResponse } from "next/server"
import { z } from "zod"

import { COLUMN_SELECT, getColumnOwner, mapColumnRow, requireUser } from "@/lib/kanban/server"
import { needsRebalance, positionBetween, rebalancePositions } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  beforeId: z.string().uuid().nullable(),
  afterId: z.string().uuid().nullable(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { beforeId, afterId } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getColumnOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    const { data: siblingRows, error: siblingsError } = await admin
      .from("kanban_columns")
      .select("id, position")
      .eq("board_id", owner.boardId)
      .is("archived_at", null)
      .order("position")
    if (siblingsError) throw new Error(siblingsError.message)

    const siblings = siblingRows ?? []
    const beforePos = beforeId ? (siblings.find((c) => c.id === beforeId)?.position ?? null) : null
    const afterPos = afterId ? (siblings.find((c) => c.id === afterId)?.position ?? null) : null

    if (needsRebalance(beforePos, afterPos)) {
      const rebalanced = rebalancePositions(siblings)
      for (const c of rebalanced) {
        const { error } = await admin.from("kanban_columns").update({ position: c.position }).eq("id", c.id)
        if (error) throw new Error(error.message)
      }
    }

    const newPosition = positionBetween(beforePos, afterPos)
    const { data: updated, error } = await admin
      .from("kanban_columns")
      .update({ position: newPosition })
      .eq("id", id)
      .select(COLUMN_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível mover a coluna")

    return NextResponse.json({ column: mapColumnRow(updated) })
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
