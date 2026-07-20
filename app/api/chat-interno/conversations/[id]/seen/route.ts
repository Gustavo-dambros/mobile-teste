import { NextResponse } from "next/server"

import { isActiveMember, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!(await isActiveMember(user.id, id))) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from("chat_read_state")
      .upsert({ user_id: user.id, conversation_id: id, last_seen_at: new Date().toISOString() })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
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
