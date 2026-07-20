import { NextResponse } from "next/server"
import { z } from "zod"

import { CARD_SELECT, getColumnOwner, logCardActivity, mapCardRow, requireUser } from "@/lib/kanban/server"
import { nextPosition } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ title: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { title } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getColumnOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    const { data: siblings, error: siblingsError } = await admin
      .from("kanban_cards")
      .select("position")
      .eq("column_id", id)
    if (siblingsError) throw new Error(siblingsError.message)

    const { data: created, error } = await admin
      .from("kanban_cards")
      .insert({
        board_id: owner.boardId,
        column_id: id,
        user_id: user.id,
        title: title.trim(),
        position: nextPosition(siblings ?? []),
        priority: "media",
        cover_type: "none",
        label_ids: [],
      })
      .select(CARD_SELECT)
      .single()
    if (error || !created) throw new Error(error?.message ?? "Não foi possível criar a atividade")

    await logCardActivity(admin, { cardId: created.id, userId: user.id, action: "card_created" })

    return NextResponse.json({ card: mapCardRow(created) })
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
