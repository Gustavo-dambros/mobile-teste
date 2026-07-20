import { NextResponse } from "next/server"
import { z } from "zod"

import { CARD_SELECT, getCardOwner, logCardActivity, mapCardRow, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ archived: z.boolean() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { archived } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const { data: updated, error } = await admin
      .from("kanban_cards")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id)
      .select(CARD_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível atualizar a atividade")

    await logCardActivity(admin, {
      cardId: id,
      userId: user.id,
      action: archived ? "card_archived" : "card_restored",
    })

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
