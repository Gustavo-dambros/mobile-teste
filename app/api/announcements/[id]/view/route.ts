import { NextResponse } from "next/server"

import { requireUser } from "@/lib/announcements/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const viewedAt = new Date().toISOString()
    const { error } = await admin
      .from("announcement_views")
      .upsert({ user_id: user.id, announcement_id: id, viewed_at: viewedAt })
    if (error) throw new Error(error.message)

    const { error: readError } = await admin
      .from("announcement_notifications")
      .update({ read: true })
      .eq("announcement_id", id)
      .eq("recipient_user_id", user.id)
      .eq("read", false)
    if (readError) throw new Error(readError.message)

    return NextResponse.json({ ok: true, viewedAt })
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
