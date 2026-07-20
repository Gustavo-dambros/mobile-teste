import { NextResponse } from "next/server"

import { mapNotificationRow, NOTIFICATION_SELECT, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_NOTIFICATIONS = 200

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("activity_notifications")
      .select(NOTIFICATION_SELECT)
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS)
    if (error) throw new Error(error.message)

    return NextResponse.json({ notifications: (data ?? []).map(mapNotificationRow) })
  } catch (error) {
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
