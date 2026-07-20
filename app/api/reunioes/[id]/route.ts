import { NextResponse } from "next/server"

import { MEETING_SELECT, getFullMeeting, listMeetingIdsForUser, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    // Being logged in isn't enough — only the host, an invitee, or someone who's ever
    // participated may pull this meeting's full data (chat included). Same rule every
    // other per-meeting route in this module already uses.
    const meetingIds = await listMeetingIdsForUser(user.id)
    if (!meetingIds.includes(id)) {
      return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: meeting, error } = await admin
      .from("meetings")
      .select(MEETING_SELECT)
      .eq("id", id)
      .single()
    if (error || !meeting) {
      return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ meeting: await getFullMeeting(meeting) })
  } catch (error) {
    if (error instanceof Error && error.name === "ReunioesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
