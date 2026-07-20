import { NextResponse } from "next/server"
import { z } from "zod"

import { LABEL_SELECT, mapLabelRow, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: label } = await admin.from("kanban_labels").select("user_id").eq("id", id).maybeSingle()
    if (!label || label.user_id !== user.id) {
      return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 })
    }

    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) changes.name = body.name.trim()
    if (body.color !== undefined) changes.color = body.color

    const { data: updated, error } = await admin
      .from("kanban_labels")
      .update(changes)
      .eq("id", id)
      .select(LABEL_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível atualizar a etiqueta")

    return NextResponse.json({ label: mapLabelRow(updated) })
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

    const { data: label } = await admin.from("kanban_labels").select("user_id").eq("id", id).maybeSingle()
    if (!label || label.user_id !== user.id) {
      return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 })
    }

    const { error: deleteError } = await admin.from("kanban_labels").delete().eq("id", id)
    if (deleteError) throw new Error(deleteError.message)

    const { data: cards, error: cardsError } = await admin
      .from("kanban_cards")
      .select("id, label_ids")
      .contains("label_ids", [id])
    if (cardsError) throw new Error(cardsError.message)

    for (const card of cards ?? []) {
      const nextLabelIds = (card.label_ids ?? []).filter((l: string) => l !== id)
      const { error: updateError } = await admin
        .from("kanban_cards")
        .update({ label_ids: nextLabelIds })
        .eq("id", card.id)
      if (updateError) throw new Error(updateError.message)
    }

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
