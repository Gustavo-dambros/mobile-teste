import { NextResponse } from "next/server"
import { z } from "zod"

import {
  ANNOUNCEMENT_SELECT,
  HISTORY_SELECT,
  mapAnnouncementRow,
  mapHistoryRow,
  mapNotificationRow,
  requireUser,
  resolveRecipientUserIds,
} from "@/lib/announcements/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertActiveProfile, InactiveProfileError } from "@/lib/supabase/active-profile"

// Refetched in full on every 60s poll (lib/announcements/store.tsx) — this
// caps the pathological case of years of accumulated announcements/events,
// well above any realistic real-world count.
const MAX_ANNOUNCEMENTS = 500

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data: rows, error } = await admin
      .from("announcements")
      .select(ANNOUNCEMENT_SELECT)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(MAX_ANNOUNCEMENTS)
    if (error) throw new Error(error.message)

    const announcements = (rows ?? [])
      .map(mapAnnouncementRow)
      .filter(
        (a) =>
          a.creatorId === user.id || a.recipientUserIds.includes(user.id) || user.role === "ADMIN"
      )
    const visibleIds = announcements.map((a) => a.id)

    const [historyResult, notificationsResult, viewsResult] = await Promise.all([
      visibleIds.length > 0
        ? admin.from("announcement_history").select(HISTORY_SELECT).in("announcement_id", visibleIds)
        : Promise.resolve({ data: [], error: null }),
      admin
        .from("announcement_notifications")
        .select("id, announcement_id, recipient_user_id, kind, read, created_at")
        .eq("recipient_user_id", user.id),
      admin.from("announcement_views").select("announcement_id, viewed_at").eq("user_id", user.id),
    ])
    if (historyResult.error) throw new Error(historyResult.error.message)
    if (notificationsResult.error) throw new Error(notificationsResult.error.message)
    if (viewsResult.error) throw new Error(viewsResult.error.message)

    const viewedAt: Record<string, string> = {}
    for (const v of viewsResult.data ?? []) viewedAt[v.announcement_id] = v.viewed_at

    return NextResponse.json({
      announcements,
      history: (historyResult.data ?? []).map(mapHistoryRow),
      notifications: (notificationsResult.data ?? []).map(mapNotificationRow),
      viewedAt,
    })
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

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const recipientUserIds = await resolveRecipientUserIds(body.recipients)
    if (recipientUserIds.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um destinatário" }, { status: 400 })
    }
    await assertActiveProfile(admin, body.responsibleId)

    const { data: created, error } = await admin
      .from("announcements")
      .insert({
        type: body.type,
        title: body.title,
        description: body.description,
        event_date: body.date,
        event_time: body.time,
        responsible_id: body.responsibleId,
        creator_id: user.id,
        attachments: body.attachments,
        recipient_mode: body.recipients.mode,
        recipient_sector_ids: body.recipients.sectorIds,
        recipient_people_ids: body.recipients.userIds,
        recipient_user_ids: recipientUserIds,
      })
      .select(ANNOUNCEMENT_SELECT)
      .single()
    if (error || !created) throw new Error(error?.message ?? "Não foi possível publicar")

    const notifyIds = recipientUserIds.filter((id) => id !== user.id)
    if (notifyIds.length > 0) {
      const { error: notifyError } = await admin.from("announcement_notifications").insert(
        notifyIds.map((recipientUserId) => ({
          announcement_id: created.id,
          recipient_user_id: recipientUserId,
          kind: "published",
        }))
      )
      if (notifyError) throw new Error(notifyError.message)
    }

    return NextResponse.json({ announcement: mapAnnouncementRow(created) })
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
