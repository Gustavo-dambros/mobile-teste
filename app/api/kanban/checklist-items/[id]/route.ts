import { NextResponse } from "next/server"
import { z } from "zod"

import {
  CHECKLIST_ITEM_SELECT,
  getChecklistItemOwner,
  logCardActivity,
  mapChecklistItemRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  isCompleted: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())

    const owner = await getChecklistItemOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) changes.title = body.title.trim()
    if (body.isCompleted !== undefined) {
      changes.is_completed = body.isCompleted
      changes.completed_at = body.isCompleted ? new Date().toISOString() : null
    }

    const { data: item, error } = await admin
      .from("kanban_card_checklist_items")
      .update(changes)
      .eq("id", id)
      .select(CHECKLIST_ITEM_SELECT)
      .single()
    if (error || !item) throw new Error(error?.message ?? "Não foi possível atualizar o item")

    if (body.isCompleted === true) {
      const { data: siblings } = await admin
        .from("kanban_card_checklist_items")
        .select("is_completed")
        .eq("checklist_id", owner.checklistId)
      const allDone = (siblings ?? []).every((s) => s.is_completed)
      if (allDone) {
        await logCardActivity(admin, { cardId: owner.cardId, userId: user.id, action: "checklist_completed" })
      }
    }

    return NextResponse.json({ item: mapChecklistItemRow(item) })
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    const owner = await getChecklistItemOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("kanban_card_checklist_items").delete().eq("id", id)
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
