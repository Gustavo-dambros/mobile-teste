import { NextResponse } from "next/server"
import { z } from "zod"

import { getConversationMembers, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertActiveProfiles, InactiveProfileError } from "@/lib/supabase/active-profile"

const bodySchema = z.object({ memberIds: z.array(z.string().uuid()).min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const members = await getConversationMembers(id)
    const me = members.find((m) => m.user_id === user.id)
    if (!me || !me.is_admin) {
      return NextResponse.json(
        { error: "Só administradores podem adicionar membros" },
        { status: 403 }
      )
    }

    const existingIds = new Set(members.map((m) => m.user_id))
    const toAdd = body.memberIds.filter((memberId) => !existingIds.has(memberId))
    if (toAdd.length === 0) return NextResponse.json({ ok: true })
    await assertActiveProfiles(admin, toAdd)

    const { error } = await admin
      .from("conversation_members")
      .insert(toAdd.map((memberId) => ({ conversation_id: id, user_id: memberId, is_admin: false })))
    if (error) throw new Error(error.message)

    const { data: names } = await admin.from("profiles").select("id, name").in("id", toAdd)
    const nameById = new Map((names ?? []).map((n) => [n.id, n.name]))

    await admin.from("chat_messages").insert(
      toAdd.map((memberId) => ({
        conversation_id: id,
        kind: "system",
        author_id: user.id,
        text: `${nameById.get(memberId) ?? "Alguém"} entrou no grupo`,
        system_event: "member_added",
        system_meta: { memberId, memberName: nameById.get(memberId) ?? "Alguém" },
      }))
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof InactiveProfileError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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
