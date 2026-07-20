import { NextResponse } from "next/server"

import {
  isActiveMember,
  getCallParticipantRows,
  mapCallRow,
  requireUser,
  resolveCallIfNoneRinging,
} from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ callId: string }> }) {
  try {
    const user = await requireUser()
    const { callId } = await params
    const admin = createAdminClient()

    const { data: existing } = await admin.from("calls").select("*").eq("id", callId).single()
    if (!existing || !(await isActiveMember(user.id, existing.conversation_id))) {
      return NextResponse.json({ error: "Chamada não encontrada" }, { status: 404 })
    }

    const { data: participant } = await admin
      .from("call_participants")
      .select("*")
      .eq("call_id", callId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!participant) {
      return NextResponse.json({ error: "Você não faz parte desta chamada" }, { status: 404 })
    }

    // Already resolved by a concurrent request (e.g. answered/missed already)
    // — return the current state instead of erroring, and skip the
    // duplicate system message.
    if (participant.status === "ringing") {
      const endedAt = new Date().toISOString()
      const { data: updated } = await admin
        .from("call_participants")
        .update({ status: "declined", ended_at: endedAt })
        .eq("id", participant.id)
        .eq("status", "ringing")
        .select("*")
        .maybeSingle()
      if (updated) {
        // Only resolves the shared call (and logs it) when nobody else is
        // still ringing — a decline must never drop participants who
        // already answered or are still deciding.
        await resolveCallIfNoneRinging(admin, callId, "declined")
        await admin.from("chat_messages").insert({
          conversation_id: existing.conversation_id,
          kind: "system",
          author_id: user.id,
          text: "Chamada recusada",
          system_event: "call_log",
          system_meta: { callKind: existing.kind, callOutcome: "declined", durationSeconds: 0 },
        })
      }
    }

    const { data: call, error } = await admin.from("calls").select("*").eq("id", callId).single()
    if (error || !call) throw new Error(error?.message ?? "Não foi possível recusar a chamada")
    const participants = await getCallParticipantRows(admin, callId)

    return NextResponse.json({ call: mapCallRow(call, participants) })
  } catch (error) {
    if (error instanceof Error && error.name === "ChatAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
