import { NextResponse } from "next/server"

import { requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Unread meeting invites for the current user — backs the sidebar badge and the central
 * MeetingInviteModal, the direct structural analog of announcement_notifications. */
export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("meeting_invite_notifications")
      .select("id, meeting_id, created_at")
      .eq("recipient_user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({
      notifications: (data ?? []).map((row) => ({
        id: row.id,
        meetingId: row.meeting_id,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ReunioesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
