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
    // Unlike answer/decline/miss, this route previously only checked
    // conversation membership — any current member (even one added to the
    // group after the call started) could force-end an in-progress call for
    // everyone else. Require an actual call_participants row, same as the
    // other three actions.
    const { data: participant } = await admin
      .from("call_participants")
      .select("id")
      .eq("call_id", callId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!participant) {
      return NextResponse.json({ error: "Você não faz parte desta chamada" }, { status: 404 })
    }
    if (existing.status === "ended" || existing.status === "declined" || existing.status === "missed") {
      const participants = await getCallParticipantRows(admin, callId)
      return NextResponse.json({ call: mapCallRow(existing, participants) })
    }

    const endedAt = new Date().toISOString()

    // Nobody ever connected — hanging up/cancelling at this stage always
    // terminates the whole invitation, for a DM and a group alike.
    if (existing.status === "ringing") {
      const { data: call, error } = await admin
        .from("calls")
        .update({ status: "ended", ended_at: endedAt })
        .eq("id", callId)
        .eq("status", "ringing")
        .select("*")
        .single()
      if (error || !call) throw new Error(error?.message ?? "Não foi possível encerrar a chamada")

      await admin.from("chat_messages").insert({
        conversation_id: existing.conversation_id,
        kind: "system",
        author_id: user.id,
        text: "Chamada perdida",
        system_event: "call_log",
        system_meta: { callKind: existing.kind, callOutcome: "missed", durationSeconds: 0 },
      })

      const participants = await getCallParticipantRows(admin, callId)
      return NextResponse.json({ call: mapCallRow(call, participants) })
    }

    const durationSeconds = existing.answered_at
      ? Math.round((new Date(endedAt).getTime() - new Date(existing.answered_at).getTime()) / 1000)
      : 0

    const { data: conversation } = await admin
      .from("conversations")
      .select("kind")
      .eq("id", existing.conversation_id)
      .single()

    if (conversation?.kind !== "group") {
      // DM: either side hanging up always ends it for both, same as before.
      const { data: call, error } = await admin
        .from("calls")
        .update({ status: "ended", ended_at: endedAt })
        .eq("id", callId)
        .select("*")
        .single()
      if (error || !call) throw new Error(error?.message ?? "Não foi possível encerrar a chamada")
      await admin
        .from("call_participants")
        .update({ status: "left", ended_at: endedAt })
        .eq("call_id", callId)
        .eq("status", "active")

      await admin.from("chat_messages").insert({
        conversation_id: existing.conversation_id,
        kind: "system",
        author_id: user.id,
        text: "Chamada encerrada",
        system_event: "call_log",
        system_meta: { callKind: existing.kind, callOutcome: "completed", durationSeconds },
      })

      const participants = await getCallParticipantRows(admin, callId)
      return NextResponse.json({ call: mapCallRow(call, participants) })
    }

    // Group + already active. With 3+ people actually talking, this
    // participant just steps out and the rest continue. But with only two
    // people actually connected, that pair IS the call — hanging up ends it
    // for the other one too, and also cancels the ring for anyone else
    // still being invited who hasn't answered yet, exactly like a DM.
    const { count: activeCountBeforeLeaving } = await admin
      .from("call_participants")
      .select("id", { count: "exact", head: true })
      .eq("call_id", callId)
      .eq("status", "active")

    let call = existing
    if ((activeCountBeforeLeaving ?? 0) <= 2) {
      await admin
        .from("call_participants")
        .update({ status: "left", ended_at: endedAt })
        .eq("call_id", callId)
        .eq("status", "active")

      const { data: updatedCall } = await admin
        .from("calls")
        .update({ status: "ended", ended_at: endedAt })
        .eq("id", callId)
        .eq("status", "active")
        .select("*")
        .single()
      if (updatedCall) call = updatedCall

      await admin.from("chat_messages").insert({
        conversation_id: existing.conversation_id,
        kind: "system",
        author_id: user.id,
        text: "Chamada encerrada",
        system_event: "call_log",
        system_meta: { callKind: existing.kind, callOutcome: "completed", durationSeconds },
      })
    } else {
      await admin
        .from("call_participants")
        .update({ status: "left", ended_at: endedAt })
        .eq("call_id", callId)
        .eq("user_id", user.id)
        .eq("status", "active")
    }

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
