import { NextResponse } from "next/server"

import { ReunioesHostError, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Transfers host to another registered participant already in the meeting. Guests
 * can't be promoted — hosting requires a real profiles.id for meetings.host_id. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, participantId } = await params
    await requireHostMeeting(id, user)

    const admin = createAdminClient()
    const { data: target, error: targetError } = await admin
      .from("meeting_participants")
      .select("id, kind, user_id")
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
      .maybeSingle()
    if (targetError) throw new Error(targetError.message)
    if (!target) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }
    if (target.kind !== "registered" || !target.user_id) {
      return NextResponse.json(
        { error: "Só é possível transferir a organização para um usuário cadastrado" },
        { status: 400 }
      )
    }

    const { error } = await admin.from("meetings").update({ host_id: target.user_id }).eq("id", id)
    if (error) throw new Error(error.message)

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
