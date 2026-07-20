import { NextResponse } from "next/server"
import { z } from "zod"

import { getConversationMembers, mapConversation, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const members = await getConversationMembers(id)
    const me = members.find((m) => m.user_id === user.id)
    if (!me || !me.is_admin) {
      return NextResponse.json(
        { error: "Só administradores podem editar o grupo" },
        { status: 403 }
      )
    }

    const changes: Record<string, unknown> = {}
    if (body.name !== undefined) changes.name = body.name
    if (body.description !== undefined) changes.description = body.description

    const { data: conversation, error } = await admin
      .from("conversations")
      .update(changes)
      .eq("id", id)
      .select("id, kind, name, description, created_by, created_at")
      .single()
    if (error || !conversation) throw new Error(error?.message ?? "Não foi possível atualizar o grupo")

    if (body.name !== undefined) {
      await admin.from("chat_messages").insert({
        conversation_id: id,
        kind: "system",
        author_id: user.id,
        text: `${user.name} alterou o nome do grupo para "${body.name}"`,
        system_event: "name_changed",
      })
    }

    const updatedMembers = await getConversationMembers(id)
    return NextResponse.json({ conversation: mapConversation(conversation, updatedMembers, user.id) })
  } catch (error) {
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
