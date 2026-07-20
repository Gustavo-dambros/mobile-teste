import { NextResponse } from "next/server"

import {
  ReunioesHostError,
  logMeetingAdminAction,
  requireHostMeeting,
  requireUser,
} from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host allows a force-off camera to be turned back on — clears the lock only, never
 * turns the camera on itself (same reasoning as unlock-mic: forcing someone's camera on
 * without their own action would be a privacy issue). */
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
      .update({ camera_locked: false })
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
    if (error) throw new Error(error.message)

    await logMeetingAdminAction({
      meetingId: id,
      actorId: user.id,
      action: "unlock_camera",
      targetParticipantId: participantId,
    })

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
