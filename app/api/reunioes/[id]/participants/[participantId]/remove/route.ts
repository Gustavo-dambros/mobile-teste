import { NextResponse } from "next/server"
import { RoomServiceClient } from "livekit-server-sdk"

import {
  MEETING_SELECT,
  ReunioesHostError,
  getFullMeeting,
  logMeetingAdminAction,
  requireHostMeeting,
  requireUser,
} from "@/lib/reunioes/server"
import { roomNameForMeeting } from "@/app/api/reunioes/livekit-token/route"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host removes a participant — marks them left, then hard-kicks them off the
 * LiveKit room via the server SDK so they can't just keep publishing/subscribing
 * after being removed (a cooperative client-side disconnect isn't enough). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, participantId } = await params
    await requireHostMeeting(id, user)

    const admin = createAdminClient()
    const { data: participant, error } = await admin
      .from("meeting_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
      .select("id, name, user_id, email, kind")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }

    await admin
      .from("meetings")
      .update({ active_screen_share_participant_id: null })
      .eq("id", id)
      .eq("active_screen_share_participant_id", participantId)

    // Permanently blocked until the host explicitly re-invites them (see the invite route,
    // which clears this by setting unblocked_at) — enforced server-side in join/livekit-token/
    // invite-request, so it survives a refresh, a different browser, or an incognito window.
    await admin.from("meeting_blocked_participants").insert({
      meeting_id: id,
      user_id: participant.user_id,
      email: participant.user_id ? null : participant.email,
      blocked_by_id: user.id,
    })

    // A link-guest who gets removed must not be able to just reopen the same tab/link
    // and back in — rotate the invite link right away (same rotation "Gerar novo link"
    // does manually) so the token they used stops admitting anyone. Registered
    // participants don't enter via this link, so their removal doesn't touch it.
    // Unlike the manual regenerate action, this does NOT clear other guests' blocks —
    // only this one person's link access dies, everyone else's standing is untouched.
    if (participant.kind === "guest") {
      await admin
        .from("meetings")
        .update({ invite_token: crypto.randomUUID() })
        .eq("id", id)
    }

    await logMeetingAdminAction({
      meetingId: id,
      actorId: user.id,
      action: "remove_participant",
      targetParticipantId: participantId,
      targetLabel: participant.name,
    })

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const livekitHttpUrl = process.env.LIVEKIT_URL
    if (apiKey && apiSecret && livekitHttpUrl) {
      const roomService = new RoomServiceClient(livekitHttpUrl, apiKey, apiSecret)
      try {
        await roomService.removeParticipant(roomNameForMeeting(id), participantId)
      } catch {
        // Participant may have already disconnected on their own — not an error.
      }
    }

    const { data: freshMeeting } = await admin.from("meetings").select(MEETING_SELECT).eq("id", id).single()
    return NextResponse.json({ ok: true, meeting: freshMeeting ? await getFullMeeting(freshMeeting) : undefined })
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
