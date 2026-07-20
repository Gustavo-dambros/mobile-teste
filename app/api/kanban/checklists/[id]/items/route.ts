import { NextResponse } from "next/server"
import { z } from "zod"

import {
  CHECKLIST_ITEM_SELECT,
  getChecklistOwner,
  mapChecklistItemRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ title: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { title } = bodySchema.parse(await request.json())

    const owner = await getChecklistOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Checklist não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { count } = await admin
      .from("kanban_card_checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("checklist_id", id)

    const { data: item, error } = await admin
      .from("kanban_card_checklist_items")
      .insert({ checklist_id: id, title: title.trim(), position: ((count ?? 0) + 1) * 1000 })
      .select(CHECKLIST_ITEM_SELECT)
      .single()
    if (error || !item) throw new Error(error?.message ?? "Não foi possível adicionar o item")

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
