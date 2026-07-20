import { NextResponse } from "next/server"

import { MEETING_SELECT, ReunioesHostError, getFullMeeting, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { stopActiveRecordingForMeeting } from "@/lib/reunioes/recordings"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const meeting = await requireHostMeeting(id, user)
    const admin = createAdminClient()

    const endedAt = new Date().toISOString()
    const { error: updateError } = await admin
      .from("meetings")
      .update({ status: "encerrada", ended_at: endedAt })
      .eq("id", id)
    if (updateError) throw new Error(updateError.message)

    // Ending the meeting shouldn't leave a recording running forever — request egress
    // to stop; reconcilePendingRecordings picks up the finished file once LiveKit
    // reports it done (see lib/reunioes/recordings.ts).
    await stopActiveRecordingForMeeting(id)

    const { error: leaveError } = await admin
      .from("meeting_participants")
      .update({ left_at: endedAt })
      .eq("meeting_id", id)
      .is("left_at", null)
    if (leaveError) throw new Error(leaveError.message)

    // A stale invite to a meeting that's already over shouldn't keep showing up in the
    // sidebar badge / central invite card.
    await admin.from("meeting_invite_notifications").update({ read: true }).eq("meeting_id", id).eq("read", false)

    const { data: updated } = await admin.from("meetings").select(MEETING_SELECT).eq("id", id).single()
    return NextResponse.json({ meeting: await getFullMeeting(updated ?? { ...meeting, status: "encerrada", ended_at: endedAt }) })
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
