import { NextResponse } from "next/server"
import { EncodedFileOutput, EncodedFileType, EgressClient, EncodingOptions } from "livekit-server-sdk"

import {
  MEETING_SELECT,
  ReunioesHostError,
  getFullMeeting,
  logMeetingAdminAction,
  requireHostMeeting,
  requireUser,
} from "@/lib/reunioes/server"
import { getEgressClient, recordingRelativePath } from "@/lib/reunioes/egress"
import { roomNameForMeeting } from "@/app/api/reunioes/livekit-token/route"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host starts LiveKit Egress room-composite recording — the returned egressId is the
 * only cross-reference between LiveKit and our meeting_recordings row; the actual file
 * only becomes downloadable once the egress_ended webhook fires (see egress-webhook route). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const meeting = await requireHostMeeting(id, user)
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("meeting_recordings")
      .select("id")
      .eq("meeting_id", id)
      .eq("status", "recording")
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: "Esta reunião já está sendo gravada." }, { status: 409 })
    }

    let egress: EgressClient
    try {
      egress = getEgressClient()
    } catch {
      return NextResponse.json(
        { error: "Gravação não está disponível neste ambiente." },
        { status: 501 }
      )
    }

    // filepath is written by the egress container under /out — the id isn't known until
    // after start(), so we use a fresh uuid as the filename instead of the egressId.
    const fileId = crypto.randomUUID()
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `/out/${recordingRelativePath(id, fileId)}`,
    })

    // A meeting recording is talking heads + the occasional shared screen, not
    // cinematic content — LiveKit's default (1080p/30fps/~4500kbps) runs close to 2GB
    // per hour. 720p/15fps/1500kbps stays perfectly legible for that use case and cuts
    // file size roughly 70-80%.
    const encodingOptions = new EncodingOptions({
      width: 1280,
      height: 720,
      framerate: 15,
      videoBitrate: 1500,
      audioBitrate: 64,
    })

    const info = await egress.startRoomCompositeEgress(
      roomNameForMeeting(id),
      { file: output },
      { encodingOptions }
    )

    const { error: insertError } = await admin.from("meeting_recordings").insert({
      meeting_id: id,
      egress_id: info.egressId,
      status: "recording",
      started_by_id: user.id,
      local_path: recordingRelativePath(id, fileId),
    })
    if (insertError) throw new Error(insertError.message)

    await logMeetingAdminAction({ meetingId: id, actorId: user.id, action: "start_recording" })

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
