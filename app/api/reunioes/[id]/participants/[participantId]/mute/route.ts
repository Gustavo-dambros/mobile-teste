import { NextResponse } from "next/server"

import { ReunioesHostError, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host forces a participant's mic off — the participant's own client notices the
 * change on its next poll and disables its LiveKit publish. Also locks the mic
 * (mic_locked) so they can't just turn it back on themselves by clicking their own
 * mic button — only the host clearing the lock (unlock-mic) restores that ability. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, participantId } = await params
    await requireHostMeeting(id, user)

    const admin = createAdminClient()
    const { error } = await admin
      .from("meeting_participants")
      .update({ mic_on: false, mic_locked: true })
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
    if (error) throw new Error(error.message)

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
