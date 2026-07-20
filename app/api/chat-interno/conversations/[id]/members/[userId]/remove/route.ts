import { NextResponse } from "next/server"

import { getConversationMembers, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, userId } = await params
    const admin = createAdminClient()

    const members = await getConversationMembers(id)
    const me = members.find((m) => m.user_id === user.id)
    if (!me || !me.is_admin) {
      return NextResponse.json(
        { error: "Só administradores podem remover membros" },
        { status: 403 }
      )
    }

    const target = members.find((m) => m.user_id === userId)
    const targetName = target?.profiles
      ? Array.isArray(target.profiles)
        ? target.profiles[0]?.name
        : target.profiles.name
      : "Alguém"

    const { error } = await admin
      .from("conversation_members")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", userId)
    if (error) throw new Error(error.message)

    await admin.from("chat_messages").insert({
      conversation_id: id,
      kind: "system",
      author_id: user.id,
      text: `${targetName} foi removido(a) do grupo`,
      system_event: "member_removed",
      system_meta: { memberId: userId, memberName: targetName },
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
