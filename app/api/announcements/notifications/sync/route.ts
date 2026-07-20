import { NextResponse } from "next/server"

import { mapNotificationRow, requireUser } from "@/lib/announcements/server"
import { computeApplicableTriggers } from "@/lib/announcements/schedule"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data: announcements, error } = await admin
      .from("announcements")
      .select("id, event_date, event_time, created_at, creator_id")
      .eq("deleted", false)
      .contains("recipient_user_ids", [user.id])
    if (error) throw new Error(error.message)

    const { data: existingNotifications, error: existingError } = await admin
      .from("announcement_notifications")
      .select("announcement_id, kind")
      .eq("recipient_user_id", user.id)
      .in("kind", ["reminder-1d", "reminder-day-of"])
    if (existingError) throw new Error(existingError.message)

    const existingKey = (announcementId: string, kind: string) => `${announcementId}:${kind}`
    const existing = new Set((existingNotifications ?? []).map((n) => existingKey(n.announcement_id, n.kind)))

    const now = Date.now()
    const toInsert: { announcement_id: string; recipient_user_id: string; kind: string }[] = []
    for (const a of announcements ?? []) {
      if (a.creator_id === user.id) continue
      const triggers = computeApplicableTriggers(a.event_date, a.event_time, a.created_at)
      for (const trigger of triggers) {
        if (trigger.triggerAt.getTime() > now) continue
        if (existing.has(existingKey(a.id, trigger.kind))) continue
        toInsert.push({ announcement_id: a.id, recipient_user_id: user.id, kind: trigger.kind })
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await admin.from("announcement_notifications").insert(toInsert)
      if (insertError) throw new Error(insertError.message)
    }

    const { data: notifications, error: notificationsError } = await admin
      .from("announcement_notifications")
      .select("id, announcement_id, recipient_user_id, kind, read, created_at")
      .eq("recipient_user_id", user.id)
    if (notificationsError) throw new Error(notificationsError.message)

    return NextResponse.json({ notifications: (notifications ?? []).map(mapNotificationRow) })
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
