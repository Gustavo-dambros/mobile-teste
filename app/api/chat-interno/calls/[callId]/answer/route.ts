import { NextResponse } from "next/server"

import { isActiveMember, getCallParticipantRows, mapCallRow, requireUser } from "@/lib/chat-interno/server"
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

    // Already answered (e.g. a concurrent request got there first, or the
    // client retried) — treat as success and return the current state
    // instead of erroring on the conditional update matching zero rows.
    if (participant.status === "ringing") {
      const answeredAt = new Date().toISOString()
      await admin
        .from("call_participants")
        .update({ status: "active", joined_at: answeredAt })
        .eq("id", participant.id)
        .eq("status", "ringing")
      // First-ever answer promotes the shared call to active — everyone
      // else invited keeps ringing independently until they personally
      // answer, decline, or time out.
      await admin
        .from("calls")
        .update({ status: "active", answered_at: answeredAt })
        .eq("id", callId)
        .eq("status", "ringing")
    }

    const { data: call, error } = await admin.from("calls").select("*").eq("id", callId).single()
    if (error || !call) throw new Error(error?.message ?? "Não foi possível atender a chamada")
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
