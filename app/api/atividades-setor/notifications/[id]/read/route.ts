import { NextResponse } from "next/server"

import { mapNotificationRow, NOTIFICATION_SELECT, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: notification, error } = await admin
      .from("activity_notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("recipient_user_id", user.id)
      .select(NOTIFICATION_SELECT)
      .single()
    if (error || !notification) throw new Error(error?.message ?? "Notificação não encontrada")

    return NextResponse.json({ notification: mapNotificationRow(notification) })
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
