import { NextResponse } from "next/server"

import { type CallParticipantRow, mapCallRow, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Polling fallback for call state (ringing/active) — realtime broadcast
 * gives instant updates when the WebSocket connection works, but calls have
 * no other polling loop today, so a client whose broadcast connection is
 * silently broken would never see an incoming call ring. Polled every few
 * seconds from useChatInterno so an incoming call is never missed.
 *
 * The `knownIds` param carries the ids of calls the client currently shows
 * as ringing. Without it, once a call flips to a terminal status (missed/
 * declined/ended) it drops out of the ringing/active filter below and a
 * client that never got the realtime broadcast for that transition (same
 * silent-disconnect scenario) would keep ringing forever — so we also
 * return the current row for any known id, terminal or not.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data: memberRows, error: memberError } = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id)
      .is("left_at", null)
    if (memberError) throw new Error(memberError.message)

    const conversationIds = (memberRows ?? []).map((r) => r.conversation_id)
    if (conversationIds.length === 0) return NextResponse.json({ calls: [] })

    const knownIds = (new URL(request.url).searchParams.get("knownIds") ?? "")
      .split(",")
      .filter((id) => UUID_RE.test(id))

    let query = admin.from("calls").select("*").in("conversation_id", conversationIds)
    query =
      knownIds.length > 0
        ? query.or(`status.in.(ringing,active),id.in.(${knownIds.join(",")})`)
        : query.in("status", ["ringing", "active"])

    const { data, error } = await query.order("started_at", { ascending: false })
    if (error) throw new Error(error.message)

    const callIds = (data ?? []).map((c) => c.id)
    let participantRows: CallParticipantRow[] = []
    if (callIds.length > 0) {
      const { data: rows } = await admin.from("call_participants").select("*").in("call_id", callIds)
      participantRows = rows ?? []
    }
    const participantsByCall = new Map<string, CallParticipantRow[]>()
    for (const p of participantRows) {
      const list = participantsByCall.get(p.call_id) ?? []
      list.push(p)
      participantsByCall.set(p.call_id, list)
    }

    return NextResponse.json({
      calls: (data ?? []).map((call) => mapCallRow(call, participantsByCall.get(call.id) ?? [])),
    })
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
