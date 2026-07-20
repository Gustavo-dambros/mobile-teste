import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const admin = createAdminClient()

    const { data: notifications, error } = await admin.from("system_notifications").select("id")
    if (error) throw new Error(error.message)
    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const rows = notifications.map((n) => ({ notification_id: n.id, user_id: user.id }))
    const { error: upsertError } = await admin
      .from("system_notification_reads")
      .upsert(rows, { onConflict: "notification_id,user_id", ignoreDuplicates: true })
    if (upsertError) throw new Error(upsertError.message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
