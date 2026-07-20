import { NextResponse } from "next/server"

import { isActiveMember, getCallParticipantRows, mapCallRow, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Polling fallback for a specific call's status while it's active — the
 * broadcast that would normally tell the other participant "the call
 * ended" can silently fail (confirmed to happen in this environment), which
 * would otherwise leave them stuck in the call room forever.
 */
export async function GET(request: Request, { params }: { params: Promise<{ callId: string }> }) {
  try {
    const user = await requireUser()
    const { callId } = await params
    const admin = createAdminClient()

    const { data: call } = await admin.from("calls").select("*").eq("id", callId).single()
    if (!call || !(await isActiveMember(user.id, call.conversation_id))) {
      return NextResponse.json({ error: "Chamada não encontrada" }, { status: 404 })
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
