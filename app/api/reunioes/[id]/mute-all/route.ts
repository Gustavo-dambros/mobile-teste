import { NextResponse } from "next/server"

import { ReunioesHostError, logMeetingAdminAction, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    await requireHostMeeting(id, user)

    const admin = createAdminClient()

    // Guests have user_id = null, so `.neq("user_id", ...)` would silently skip
    // them (SQL NULL comparisons are never true) — exclude the host by their
    // participant row id instead, which is set for everyone.
    const { data: hostParticipant } = await admin
      .from("meeting_participants")
      .select("id")
      .eq("meeting_id", id)
      .eq("user_id", user.id)
      .is("left_at", null)
      .maybeSingle()

    let query = admin
      .from("meeting_participants")
      .update({ mic_on: false, mic_locked: true })
      .eq("meeting_id", id)
      .is("left_at", null)
    if (hostParticipant) query = query.neq("id", hostParticipant.id)

    const { error } = await query
    if (error) throw new Error(error.message)

    await logMeetingAdminAction({ meetingId: id, actorId: user.id, action: "mute_all" })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ReunioesHostError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.name === "ReunioesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
