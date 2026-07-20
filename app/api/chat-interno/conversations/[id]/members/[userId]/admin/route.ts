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
        { error: "Só administradores podem promover outros" },
        { status: 403 }
      )
    }

    const target = members.find((m) => m.user_id === userId)
    if (!target) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 })
    }

    const { error } = await admin
      .from("conversation_members")
      .update({ is_admin: !target.is_admin })
      .eq("conversation_id", id)
      .eq("user_id", userId)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, isAdmin: !target.is_admin })
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
