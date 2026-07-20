import { NextResponse } from "next/server"

import {
  MEETING_SELECT,
  ReunioesHostError,
  getFullMeeting,
  logMeetingAdminAction,
  requireHostMeeting,
  requireUser,
} from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host rotates the meeting's invite link — the old token stops admitting anyone new
 * (see the strict token match in invite/[token]/request), which is the only way a
 * link-guest who was removed can be let back in. Also clears every still-active
 * guest block (email-based) for this meeting, since a fresh link is effectively a
 * fresh invite: a removed guest who gets the new link and tries again should get in,
 * without the host having to separately "unblock" them by email. Registered users
 * invited through the system are unaffected — they're re-invited individually via
 * /unblock, not by rotating the link. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    await requireHostMeeting(id, user)

    const admin = createAdminClient()
    const newToken = crypto.randomUUID()
    const { data: meeting, error } = await admin
      .from("meetings")
      .update({ invite_token: newToken })
      .eq("id", id)
      .select(MEETING_SELECT)
      .single()
    if (error || !meeting) throw new Error(error?.message ?? "Não foi possível gerar um novo link")

    await admin
      .from("meeting_blocked_participants")
      .update({ unblocked_at: new Date().toISOString() })
      .eq("meeting_id", id)
      .is("user_id", null)
      .is("unblocked_at", null)

    await logMeetingAdminAction({
      meetingId: id,
      actorId: user.id,
      action: "regenerate_invite_link",
    })

    return NextResponse.json({ meeting: await getFullMeeting(meeting) })
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
