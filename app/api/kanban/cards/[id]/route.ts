import { NextResponse } from "next/server"
import { z } from "zod"

import {
  CARD_SELECT,
  getCardOwner,
  logCardActivity,
  mapCardRow,
  removeAttachmentFilesForCards,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
  coverType: z.enum(["none", "color", "image"]).optional(),
  coverValue: z.string().nullable().optional(),
  startAt: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  reminderType: z
    .enum(["no_horario", "10min", "30min", "1h", "1dia", "2dias", "personalizado"])
    .nullable()
    .optional(),
  reminderCustomMinutes: z.number().nullable().optional(),
  recurrenceType: z
    .enum(["none", "diaria", "semanal", "mensal", "anual", "personalizado"])
    .nullable()
    .optional(),
  recurrenceCustomDays: z.number().nullable().optional(),
})

const FIELD_MAP: Record<string, string> = {
  title: "title",
  description: "description",
  priority: "priority",
  coverType: "cover_type",
  coverValue: "cover_value",
  startAt: "start_at",
  dueAt: "due_at",
  reminderType: "reminder_type",
  reminderCustomMinutes: "reminder_custom_minutes",
  recurrenceType: "recurrence_type",
  recurrenceCustomDays: "recurrence_custom_days",
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const changes: Record<string, unknown> = {}
    for (const [key, column] of Object.entries(FIELD_MAP)) {
      const value = (body as Record<string, unknown>)[key]
      if (value === undefined) continue
      changes[column] = typeof value === "string" && key === "title" ? value.trim() : value
    }

    if (Object.keys(changes).length === 0) {
      const { data: current, error } = await admin.from("kanban_cards").select(CARD_SELECT).eq("id", id).single()
      if (error || !current) throw new Error(error?.message ?? "Atividade não encontrada")
      return NextResponse.json({ card: mapCardRow(current) })
    }

    const { data: before } = await admin
      .from("kanban_cards")
      .select("title, description, priority, due_at")
      .eq("id", id)
      .single()

    changes.updated_at = new Date().toISOString()

    const { data: updated, error } = await admin
      .from("kanban_cards")
      .update(changes)
      .eq("id", id)
      .select(CARD_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível atualizar a atividade")

    if (before) {
      if ("title" in changes && changes.title !== before.title) {
        await logCardActivity(admin, { cardId: id, userId: user.id, action: "title_changed", newValue: String(changes.title) })
      }
      if ("description" in changes && changes.description !== before.description) {
        await logCardActivity(admin, { cardId: id, userId: user.id, action: "description_changed" })
      }
      if ("priority" in changes && changes.priority !== before.priority) {
        await logCardActivity(admin, {
          cardId: id,
          userId: user.id,
          action: "priority_changed",
          oldValue: before.priority ?? undefined,
          newValue: String(changes.priority),
        })
      }
      if ("due_at" in changes && changes.due_at !== before.due_at) {
        await logCardActivity(admin, {
          cardId: id,
          userId: user.id,
          action: changes.due_at === null ? "due_date_removed" : before.due_at ? "due_date_changed" : "due_date_set",
        })
      }
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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    await removeAttachmentFilesForCards(admin, [id])

    const { error } = await admin.from("kanban_cards").delete().eq("id", id)
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
