import { NextResponse } from "next/server"

import {
  MEETING_SELECT,
  getFullMeeting,
  isEntryCutoffPassed,
  isParticipantBlocked,
  requireUser,
} from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: meeting, error } = await admin
      .from("meetings")
      .select(MEETING_SELECT)
      .eq("id", id)
      .single()
    if (error || !meeting) {
      return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 })
    }
    if (meeting.status === "encerrada") {
      return NextResponse.json({ error: "Esta reunião já foi encerrada" }, { status: 400 })
    }
    if (await isParticipantBlocked(id, { userId: user.id })) {
      return NextResponse.json(
        { error: "Você foi removido desta reunião. Peça ao anfitrião para convidá-lo novamente." },
        { status: 403 }
      )
    }

    if (meeting.status === "agendada") {
      if (meeting.host_id !== user.id) {
        // Not an error — the invitee just has to wait for the host to start it;
        // the caller polls and retries once status flips to "ativa".
        return NextResponse.json({ notStarted: true, meeting: await getFullMeeting(meeting) })
      }
      // The duration budget (if any) starts counting from the moment the meeting
      // actually begins, not from when it was scheduled/created.
      const endsAt = meeting.duration_minutes
        ? new Date(Date.now() + meeting.duration_minutes * 60_000).toISOString()
        : null
      const { error: startError } = await admin
        .from("meetings")
        .update({ status: "ativa", ends_at: endsAt })
        .eq("id", id)
      if (startError) throw new Error(startError.message)
      meeting.status = "ativa"
      meeting.ends_at = endsAt
    }

    const { data: existing } = await admin
      .from("meeting_participants")
      .select("id")
      .eq("meeting_id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    let participantId = existing?.id as string | undefined
    if (!participantId && (await isEntryCutoffPassed(meeting.scheduled_for))) {
      return NextResponse.json(
        { error: "O prazo de entrada para esta reunião foi encerrado." },
        { status: 403 }
      )
    }
    if (existing) {
      // Reconnecting after a disconnect — always allowed regardless of cutoff, and
      // clears left_at so they show up as present again.
      await admin.from("meeting_participants").update({ left_at: null }).eq("id", existing.id)
    }
    if (!participantId) {
      const { data: inserted, error: insertError } = await admin
        .from("meeting_participants")
        .insert({ meeting_id: id, kind: "registered", user_id: user.id, name: user.name, email: user.email })
        .select("id")
        .single()
      if (insertError || !inserted) throw new Error(insertError?.message ?? "Não foi possível entrar na reunião")
      participantId = inserted.id
    }

    return NextResponse.json({ participantId, meeting: await getFullMeeting(meeting) })
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
