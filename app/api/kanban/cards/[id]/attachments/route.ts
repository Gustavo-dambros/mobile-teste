import { NextResponse } from "next/server"

import { ATTACHMENT_SELECT, getCardOwner, mapAttachmentRow, requireUser } from "@/lib/kanban/server"
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
    const { data, error } = await admin
      .from("kanban_card_attachments")
      .select(ATTACHMENT_SELECT)
      .eq("card_id", id)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({ attachments: (data ?? []).map(mapAttachmentRow) })
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
