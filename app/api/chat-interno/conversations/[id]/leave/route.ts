import { NextResponse } from "next/server"

import { requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { error } = await admin
      .from("conversation_members")
      .update({ left_at: new Date().toISOString(), is_admin: false })
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .is("left_at", null)
    if (error) throw new Error(error.message)

    await admin.from("chat_messages").insert({
      conversation_id: id,
      kind: "system",
      author_id: user.id,
      text: `${user.name} saiu do grupo`,
      system_event: "member_left",
      system_meta: { memberId: user.id, memberName: user.name },
    })

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
