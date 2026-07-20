import { NextResponse } from "next/server"
import { z } from "zod"

import { MESSAGE_SELECT, mapMessageRow, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ text: z.string().min(1) })

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await requireUser()
    const { messageId } = await params
    const { text } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("chat_messages")
      .select("author_id, kind")
      .eq("id", messageId)
      .single()
    if (!existing || existing.author_id !== user.id || existing.kind !== "message") {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    const { data: message, error } = await admin
      .from("chat_messages")
      .update({ text, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .select(MESSAGE_SELECT)
      .single()
    if (error || !message) throw new Error(error?.message ?? "Não foi possível editar a mensagem")

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
