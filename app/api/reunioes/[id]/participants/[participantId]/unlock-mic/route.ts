import { NextResponse } from "next/server"

import { ReunioesHostError, logMeetingAdminAction, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host allows a force-muted participant to unmute themselves again — clears the
 * lock only, never turns their mic on (forcing someone's mic on without their own
 * action would be a privacy issue; the participant still has to click their own
 * mic button to actually publish audio again). */
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
      .update({ mic_locked: false })
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
    if (error) throw new Error(error.message)

    await logMeetingAdminAction({
      meetingId: id,
      actorId: user.id,
      action: "unlock_mic",
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
