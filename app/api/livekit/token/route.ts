import { NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"
import { z } from "zod"

import { isActiveMember, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ callId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: "LiveKit ainda não está configurado neste ambiente." },
        { status: 501 }
      )
    }

    const { callId } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: call } = await admin
      .from("calls")
      .select("room_name, conversation_id, status")
      .eq("id", callId)
      .single()
    if (!call || !(await isActiveMember(user.id, call.conversation_id))) {
      return NextResponse.json({ error: "Chamada não encontrada" }, { status: 404 })
    }
    if (call.status === "ended" || call.status === "declined" || call.status === "missed") {
      return NextResponse.json({ error: "Esta chamada já foi encerrada" }, { status: 400 })
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.name,
    })
    token.addGrant({ roomJoin: true, room: call.room_name })

    return NextResponse.json({ token: await token.toJwt(), url: livekitUrl })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "ChatAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
