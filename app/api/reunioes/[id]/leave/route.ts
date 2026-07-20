import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ participantId: z.string().uuid() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { participantId } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: participant } = await admin
      .from("meeting_participants")
      .select("id, kind, user_id")
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
      .maybeSingle()
    if (!participant) return NextResponse.json({ ok: true })

    // Guests have no session (same meetingId+participantId trust model as /media, /chat,
    // /livekit-token — an unguessable uuid pair is their credential). Registered participants
    // do have a session, so for them we actually verify identity: only the participant
    // themselves or the host can force a "leave".
    if (participant.kind === "registered") {
      const user = await getCurrentUser()
      const { data: meeting } = await admin.from("meetings").select("host_id").eq("id", id).maybeSingle()
      const isSelf = !!user && user.id === participant.user_id
      const isHost = !!user && !!meeting && user.id === meeting.host_id
      if (!isSelf && !isHost) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      }
    }

    const { error } = await admin
      .from("meeting_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
    if (error) throw new Error(error.message)

    await admin
      .from("meetings")
      .update({ active_screen_share_participant_id: null })
      .eq("id", id)
      .eq("active_screen_share_participant_id", participantId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
