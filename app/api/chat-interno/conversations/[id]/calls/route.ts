import { NextResponse } from "next/server"
import { z } from "zod"

import { isActiveMember, mapCallRow, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ kind: z.enum(["audio", "video"]) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { kind } = bodySchema.parse(await request.json())

    if (!(await isActiveMember(user.id, id))) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: call, error } = await admin
      .from("calls")
      .insert({
        conversation_id: id,
        kind,
        caller_id: user.id,
        status: "ringing",
        room_name: `call-${crypto.randomUUID()}`,
      })
      .select("*")
      .single()
    if (error || !call) throw new Error(error?.message ?? "Não foi possível iniciar a chamada")

    // One row per invited member so each answers/declines/times out on their
    // own — the caller's own row starts "active" (they're already committed
    // by calling) purely so group-leave bookkeeping in /end can count them
    // like everyone else; their ring/room UI is still driven by `calls.status`.
    const { data: memberRows } = await admin
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", id)
      .is("left_at", null)
    const now = new Date().toISOString()
    const participantRows = [
      { call_id: call.id, user_id: user.id, status: "active", joined_at: now },
      ...(memberRows ?? [])
        .filter((m) => m.user_id !== user.id)
        .map((m) => ({ call_id: call.id, user_id: m.user_id, status: "ringing" })),
    ]
    const { data: participants } = await admin.from("call_participants").insert(participantRows).select("*")

    return NextResponse.json({ call: mapCallRow(call, participants ?? []) })
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
