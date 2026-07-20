import { NextResponse } from "next/server"
import { z } from "zod"

import {
  ATTACHMENT_SELECT,
  KANBAN_ATTACHMENTS_BUCKET,
  getAttachmentOwner,
  logCardActivity,
  mapAttachmentRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ isCover: z.boolean() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { isCover } = bodySchema.parse(await request.json())

    const owner = await getAttachmentOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()

    if (isCover && owner.cardId) {
      await admin.from("kanban_card_attachments").update({ is_cover: false }).eq("card_id", owner.cardId)
    }

    const { data: attachment, error } = await admin
      .from("kanban_card_attachments")
      .update({ is_cover: isCover })
      .eq("id", id)
      .select(ATTACHMENT_SELECT)
      .single()
    if (error || !attachment) throw new Error(error?.message ?? "Não foi possível atualizar o anexo")

    return NextResponse.json({ attachment: mapAttachmentRow(attachment) })
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

    const owner = await getAttachmentOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("kanban_card_attachments").delete().eq("id", id)
    if (error) throw new Error(error.message)

    await admin.storage.from(KANBAN_ATTACHMENTS_BUCKET).remove([owner.filename])

    if (owner.cardId) {
      await logCardActivity(admin, { cardId: owner.cardId, userId: user.id, action: "attachment_removed" })
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
