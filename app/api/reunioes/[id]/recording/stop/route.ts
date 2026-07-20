import { NextResponse } from "next/server"

import {
  MEETING_SELECT,
  ReunioesHostError,
  getFullMeeting,
  logMeetingAdminAction,
  requireHostMeeting,
  requireUser,
} from "@/lib/reunioes/server"
import { getEgressClient } from "@/lib/reunioes/egress"
import { createAdminClient } from "@/lib/supabase/admin"

/** Requests egress to stop — the row flips to 'processing' here and to 'ready' (or
 * 'failed') once the egress_ended webhook actually delivers the finished file. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const meeting = await requireHostMeeting(id, user)
    const admin = createAdminClient()

    const { data: recording } = await admin
      .from("meeting_recordings")
      .select("id, egress_id")
      .eq("meeting_id", id)
      .eq("status", "recording")
      .maybeSingle()
    if (!recording) {
      return NextResponse.json({ error: "Nenhuma gravação em andamento." }, { status: 404 })
    }

    const egress = getEgressClient()
    await egress.stopEgress(recording.egress_id)

    await admin
      .from("meeting_recordings")
      .update({ status: "processing", stopped_by_id: user.id })
      .eq("id", recording.id)

    await logMeetingAdminAction({ meetingId: id, actorId: user.id, action: "stop_recording" })

    const { data: updated } = await admin.from("meetings").select(MEETING_SELECT).eq("id", id).single()
    return NextResponse.json({ meeting: await getFullMeeting(updated ?? meeting) })
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
