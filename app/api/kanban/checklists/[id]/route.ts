import { NextResponse } from "next/server"
import { z } from "zod"

import {
  CHECKLIST_SELECT,
  getChecklistOwner,
  logCardActivity,
  mapChecklistRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ title: z.string().min(1) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { title } = bodySchema.parse(await request.json())

    const owner = await getChecklistOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: checklist, error } = await admin
      .from("kanban_card_checklists")
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(CHECKLIST_SELECT)
      .single()
    if (error || !checklist) throw new Error(error?.message ?? "Não foi possível atualizar o checklist")

    return NextResponse.json({ checklist: mapChecklistRow(checklist) })
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

    const owner = await getChecklistOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("kanban_card_checklists").delete().eq("id", id)
    if (error) throw new Error(error.message)

    await logCardActivity(admin, { cardId: owner.cardId, userId: user.id, action: "checklist_removed" })

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
