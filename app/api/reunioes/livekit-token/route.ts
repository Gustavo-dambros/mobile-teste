import { NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"
import { z } from "zod"

import { isParticipantBlocked } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Deterministic per-meeting LiveKit room — no separate room_name column needed. */
export function roomNameForMeeting(meetingId: string) {
  return `reuniao-${meetingId}`
}

const bodySchema = z.object({
  meetingId: z.string().uuid(),
  participantId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: "LiveKit ainda não está configurado neste ambiente." },
        { status: 501 }
      )
    }

    const { meetingId, participantId } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    // No session required — same trust model as /media, /chat, /leave: a
    // valid meetingId+participantId pair (both unguessable uuids) is the
    // credential, since a guest joining via invite link never has a session.
    const { data: participant } = await admin
      .from("meeting_participants")
      .select("id, name, user_id, email")
      .eq("id", participantId)
      .eq("meeting_id", meetingId)
      .is("left_at", null)
      .maybeSingle()
    if (!participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }

    // Defense in depth — the actual media-issuing gate, in case something upstream
    // (join / invite request) let a since-blocked participant row slip through.
    if (
      await isParticipantBlocked(meetingId, {
        userId: participant.user_id ?? undefined,
        email: participant.email ?? undefined,
      })
    ) {
      return NextResponse.json({ error: "Você foi removido desta reunião." }, { status: 403 })
    }

    const { data: meeting } = await admin
      .from("meetings")
      .select("status")
      .eq("id", meetingId)
      .maybeSingle()
    if (!meeting || meeting.status === "encerrada") {
      return NextResponse.json({ error: "Esta reunião já foi encerrada" }, { status: 400 })
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participant.id,
      name: participant.name,
    })
    token.addGrant({ roomJoin: true, room: roomNameForMeeting(meetingId) })

    return NextResponse.json({ token: await token.toJwt(), url: livekitUrl })
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
