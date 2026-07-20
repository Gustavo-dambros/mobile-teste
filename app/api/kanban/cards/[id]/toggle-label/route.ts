import { NextResponse } from "next/server"
import { z } from "zod"

import { CARD_SELECT, getCardOwner, logCardActivity, mapCardRow, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ labelId: z.string().uuid() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { labelId } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getCardOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const { data: label } = await admin.from("kanban_labels").select("user_id, name").eq("id", labelId).maybeSingle()
    if (!label || label.user_id !== user.id) {
      return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 })
    }

    const { data: current, error: currentError } = await admin
      .from("kanban_cards")
      .select("label_ids")
      .eq("id", id)
      .single()
    if (currentError || !current) throw new Error(currentError?.message ?? "Atividade não encontrada")

    const labelIds: string[] = current.label_ids ?? []
    const wasAdded = !labelIds.includes(labelId)
    const nextLabelIds = wasAdded ? [...labelIds, labelId] : labelIds.filter((l) => l !== labelId)

    const { data: updated, error } = await admin
      .from("kanban_cards")
      .update({ label_ids: nextLabelIds, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(CARD_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível atualizar as etiquetas")

    await logCardActivity(admin, {
      cardId: id,
      userId: user.id,
      action: wasAdded ? "label_added" : "label_removed",
      newValue: wasAdded ? label.name : undefined,
      oldValue: wasAdded ? undefined : label.name,
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
