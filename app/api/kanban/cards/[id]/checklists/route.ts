import { NextResponse } from "next/server"
import { z } from "zod"

import {
  CHECKLIST_ITEM_SELECT,
  CHECKLIST_SELECT,
  getCardOwner,
  logCardActivity,
  mapChecklistItemRow,
  mapChecklistRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: checklists, error } = await admin
      .from("kanban_card_checklists")
      .select(CHECKLIST_SELECT)
      .eq("card_id", id)
      .order("position", { ascending: true })
    if (error) throw new Error(error.message)

    const checklistIds = (checklists ?? []).map((c) => c.id)
    const { data: items, error: itemsError } =
      checklistIds.length > 0
        ? await admin
            .from("kanban_card_checklist_items")
            .select(CHECKLIST_ITEM_SELECT)
            .in("checklist_id", checklistIds)
            .order("position", { ascending: true })
        : { data: [], error: null }
    if (itemsError) throw new Error(itemsError.message)

    return NextResponse.json({
      checklists: (checklists ?? []).map(mapChecklistRow),
      items: (items ?? []).map(mapChecklistItemRow),
    })
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

const bodySchema = z.object({ title: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { title } = bodySchema.parse(await request.json())

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { count } = await admin
      .from("kanban_card_checklists")
      .select("id", { count: "exact", head: true })
      .eq("card_id", id)

    const { data: checklist, error } = await admin
      .from("kanban_card_checklists")
      .insert({ card_id: id, title: title.trim(), position: ((count ?? 0) + 1) * 1000 })
      .select(CHECKLIST_SELECT)
      .single()
    if (error || !checklist) throw new Error(error?.message ?? "Não foi possível criar o checklist")

    await logCardActivity(admin, { cardId: id, userId: user.id, action: "checklist_added" })

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
