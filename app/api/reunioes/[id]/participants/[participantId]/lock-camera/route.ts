import { NextResponse } from "next/server"

import { ReunioesHostError, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host forces a participant's camera off — same lock semantics as mute/route.ts:
 * the participant's own client notices on its next poll and disables its LiveKit
 * publish, and can't turn it back on themselves until the host clears the lock
 * (unlock-camera). */
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
      .update({ camera_on: false, camera_locked: true })
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
