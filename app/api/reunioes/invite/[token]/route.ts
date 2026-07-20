import { NextResponse } from "next/server"

import { MEETING_SELECT, getFullMeeting, getLatestRecording } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const guestId = new URL(request.url).searchParams.get("guestId")
    const admin = createAdminClient()

    // A guest who already has a session (admitted, removed, or waiting) is pinned to
    // their meeting by guestId, not by the link in their address bar — otherwise the
    // host regenerating the invite link (manually, or automatically on removal — see
    // participants/[participantId]/remove) would also 404 out everyone else who's
    // already inside via that same old link. Deliberately NOT filtering left_at here:
    // a removed guest (left_at set) must still resolve to their meeting so the status
    // check below can tell them apart ("denied", not "Link inválido") — rotating the
    // link only closes the door to *new* entry attempts (see request/route.ts).
    async function meetingIdForGuest(): Promise<string | undefined> {
      if (!guestId) return undefined
      const { data: viaParticipant } = await admin
        .from("meeting_participants")
        .select("meeting_id")
        .eq("id", guestId)
        .maybeSingle()
      if (viaParticipant) return viaParticipant.meeting_id
      const { data: viaWaiting } = await admin
        .from("meeting_waiting_guests")
        .select("meeting_id")
        .eq("id", guestId)
        .maybeSingle()
      return viaWaiting?.meeting_id
    }

    const pinnedMeetingId = await meetingIdForGuest()
    const { data: meeting, error } = pinnedMeetingId
      ? await admin.from("meetings").select(MEETING_SELECT).eq("id", pinnedMeetingId).maybeSingle()
      : await admin.from("meetings").select(MEETING_SELECT).eq("invite_token", token).maybeSingle()
    if (error || !meeting) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 })
    }

    if (meeting.status === "encerrada") {
      const latestRecording = await getLatestRecording(meeting.id)
      return NextResponse.json({
        status: "ended",
        meeting: {
          id: meeting.id,
          title: meeting.title,
          status: meeting.status,
          latestRecording: latestRecording ?? undefined,
        },
      })
    }

    if (meeting.status === "agendada" && !guestId) {
      return NextResponse.json({
        status: "not_started",
        meeting: { id: meeting.id, title: meeting.title, status: meeting.status },
        scheduledFor: meeting.scheduled_for,
      })
    }

    if (!guestId) {
      return NextResponse.json({
        status: "open",
        meeting: { id: meeting.id, title: meeting.title, status: meeting.status },
        requiresPassword: meeting.password_hash !== null,
      })
    }

    const { data: participant } = await admin
      .from("meeting_participants")
      .select("id")
      .eq("id", guestId)
      .eq("meeting_id", meeting.id)
      .is("left_at", null)
      .maybeSingle()
    if (participant) {
      return NextResponse.json({ status: "admitted", meeting: await getFullMeeting(meeting) })
    }

    const { data: waitingGuest } = await admin
      .from("meeting_waiting_guests")
      .select("id")
      .eq("id", guestId)
      .eq("meeting_id", meeting.id)
      .maybeSingle()
    if (waitingGuest) {
      return NextResponse.json({ status: "waiting" })
    }

    return NextResponse.json({ status: "denied" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
