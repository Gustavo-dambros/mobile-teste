import { NextResponse } from "next/server"
import { z } from "zod"

import {
  ANNOUNCEMENT_SELECT,
  mapAnnouncementRow,
  requireUser,
  resolveRecipientUserIds,
} from "@/lib/announcements/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertActiveProfile, InactiveProfileError } from "@/lib/supabase/active-profile"

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  kind: z.enum(["image", "video", "document"]),
  mimeType: z.string(),
  url: z.string(),
})

const recipientsSchema = z.object({
  mode: z.enum(["all", "sectors", "people"]),
  sectorIds: z.array(z.string()),
  userIds: z.array(z.string().uuid()),
})

const bodySchema = z.object({
  type: z.enum(["Anúncio", "Evento"]),
  title: z.string().min(1),
  description: z.string(),
  date: z.string(),
  time: z.string(),
  responsibleId: z.string().uuid(),
  attachments: z.array(attachmentSchema),
  recipients: recipientsSchema,
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: current, error: currentError } = await admin
      .from("announcements")
      .select(
        "id, event_date, event_time, creator_id, recipient_user_ids, deleted"
      )
      .eq("id", id)
      .single()
    if (currentError || !current || current.deleted) {
      return NextResponse.json({ error: "Publicação não encontrada" }, { status: 404 })
    }
    if (current.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar este anúncio ou evento" },
        { status: 403 }
      )
    }

    const recipientUserIds = await resolveRecipientUserIds(body.recipients)
    if (recipientUserIds.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um destinatário" }, { status: 400 })
    }
    await assertActiveProfile(admin, body.responsibleId)

    const scheduleChanged = current.event_date !== body.date || current.event_time !== body.time
    const recipientsChanged =
      JSON.stringify([...(current.recipient_user_ids ?? [])].sort()) !==
      JSON.stringify([...recipientUserIds].sort())

    const { data: updated, error } = await admin
      .from("announcements")
      .update({
        type: body.type,
        title: body.title,
        description: body.description,
        event_date: body.date,
        event_time: body.time,
        responsible_id: body.responsibleId,
        attachments: body.attachments,
        recipient_mode: body.recipients.mode,
        recipient_sector_ids: body.recipients.sectorIds,
        recipient_people_ids: body.recipients.userIds,
        recipient_user_ids: recipientUserIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ANNOUNCEMENT_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível salvar")

    const label = body.type === "Evento" ? "o evento" : "o anúncio"
    const { error: historyError } = await admin.from("announcement_history").insert({
      announcement_id: id,
      actor_id: user.id,
      description: `${user.name} atualizou ${label}.`,
    })
    if (historyError) throw new Error(historyError.message)

    if (scheduleChanged || recipientsChanged) {
      const { error: pruneError } = await admin
        .from("announcement_notifications")
        .delete()
        .eq("announcement_id", id)
        .in("kind", ["reminder-1d", "reminder-day-of"])
      if (pruneError) throw new Error(pruneError.message)

      const notifyIds = recipientUserIds.filter((uid) => uid !== user.id)
      if (notifyIds.length > 0) {
        const { error: notifyError } = await admin.from("announcement_notifications").insert(
          notifyIds.map((recipientUserId) => ({
            announcement_id: id,
            recipient_user_id: recipientUserId,
            kind: "updated",
          }))
        )
        if (notifyError) throw new Error(notifyError.message)
      }
    }

    return NextResponse.json({ announcement: mapAnnouncementRow(updated) })
  } catch (error) {
    if (error instanceof InactiveProfileError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "AnnouncementsAuthError") {
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

    const { data: current } = await admin
      .from("announcements")
      .select("creator_id")
      .eq("id", id)
      .single()
    if (!current) {
      return NextResponse.json({ error: "Publicação não encontrada" }, { status: 404 })
    }
    if (current.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir este anúncio ou evento" },
        { status: 403 }
      )
    }

    const { error } = await admin.from("announcements").update({ deleted: true }).eq("id", id)
    if (error) throw new Error(error.message)

    const { error: notifyError } = await admin
      .from("announcement_notifications")
      .delete()
      .eq("announcement_id", id)
    if (notifyError) throw new Error(notifyError.message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === "AnnouncementsAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
