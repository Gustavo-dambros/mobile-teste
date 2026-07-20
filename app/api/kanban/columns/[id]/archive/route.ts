import { NextResponse } from "next/server"
import { z } from "zod"

import { COLUMN_SELECT, getColumnOwner, mapColumnRow, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ archived: z.boolean(), archiveCards: z.boolean().optional() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { archived, archiveCards } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getColumnOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    const archivedAt = archived ? new Date().toISOString() : null
    const { data: updated, error } = await admin
      .from("kanban_columns")
      .update({ archived_at: archivedAt })
      .eq("id", id)
      .select(COLUMN_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível arquivar a coluna")

    if (archived && archiveCards) {
      const { error: cardsError } = await admin
        .from("kanban_cards")
        .update({ archived_at: archivedAt })
        .eq("column_id", id)
        .is("archived_at", null)
      if (cardsError) throw new Error(cardsError.message)
    }

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
