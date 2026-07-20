import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const admin = createAdminClient()

    const [{ data: notifications, error }, { data: reads, error: readsError }] = await Promise.all([
      admin
        .from("system_notifications")
        .select("id, title, description, created_at")
        .order("created_at", { ascending: false }),
      admin.from("system_notification_reads").select("notification_id").eq("user_id", user.id),
    ])
    if (error) throw new Error(error.message)
    if (readsError) throw new Error(readsError.message)

    const readIds = new Set((reads ?? []).map((r) => r.notification_id))
    const items = (notifications ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      createdAt: n.created_at,
      read: readIds.has(n.id),
    }))

    return NextResponse.json({ notifications: items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
