import { NextResponse } from "next/server"
import { z } from "zod"

import { MESSAGE_SELECT, isActiveMember, mapMessageRow, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ emoji: z.string().min(1) })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, messageId } = await params
    const { emoji } = bodySchema.parse(await request.json())

    if (!(await isActiveMember(user.id, id))) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("chat_messages")
      .select("reactions")
      .eq("id", messageId)
      .eq("conversation_id", id)
      .single()
    if (!existing) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    const reactions: Record<string, string[]> = existing.reactions ?? {}
    const current = reactions[emoji] ?? []
    const has = current.includes(user.id)
    const next = has ? current.filter((id) => id !== user.id) : [...current, user.id]
    const nextReactions = { ...reactions }
    if (next.length === 0) delete nextReactions[emoji]
    else nextReactions[emoji] = next

    const { data: message, error } = await admin
      .from("chat_messages")
      .update({ reactions: nextReactions })
      .eq("id", messageId)
      .eq("conversation_id", id)
      .select(MESSAGE_SELECT)
      .single()
    if (error || !message) throw new Error(error?.message ?? "Não foi possível reagir à mensagem")

    return NextResponse.json({ message: mapMessageRow(message, user.id) })
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
