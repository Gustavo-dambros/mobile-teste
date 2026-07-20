import { NextResponse } from "next/server"
import { z } from "zod"

import {
  COLUMN_SELECT,
  getColumnOwner,
  mapColumnRow,
  removeAttachmentFilesForCards,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  isDoneColumn: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getColumnOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) changes.title = body.title.trim()
    if (body.color !== undefined) changes.color = body.color
    if (body.isDoneColumn !== undefined) changes.is_done_column = body.isDoneColumn

    const { data: updated, error } = await admin
      .from("kanban_columns")
      .update(changes)
      .eq("id", id)
      .select(COLUMN_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível atualizar a coluna")

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const owner = await getColumnOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    const { data: cardsInColumn } = await admin.from("kanban_cards").select("id").eq("column_id", id)
    await removeAttachmentFilesForCards(admin, (cardsInColumn ?? []).map((c) => c.id))

    const { error } = await admin.from("kanban_columns").delete().eq("id", id)
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
