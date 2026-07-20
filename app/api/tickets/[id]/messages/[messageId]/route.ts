import { NextResponse } from "next/server"
import { z } from "zod"

import { MESSAGE_SELECT, mapMessageRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EDIT_WINDOW_MINUTES = 15

const bodySchema = z.object({ text: z.string().min(1) })

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, messageId } = await params
    const { text } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("ticket_messages")
      .select("author_id, created_at, kind")
      .eq("id", messageId)
      .eq("ticket_id", id)
      .single()
    if (!existing || existing.author_id !== user.id || existing.kind !== "message") {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    const ageMinutes = (Date.now() - new Date(existing.created_at).getTime()) / 60_000
    if (ageMinutes > EDIT_WINDOW_MINUTES) {
      return NextResponse.json(
        { error: "O prazo para editar esta mensagem expirou." },
        { status: 400 }
      )
    }

    const { data: message, error } = await admin
      .from("ticket_messages")
      .update({ text, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("ticket_id", id)
      .select(MESSAGE_SELECT)
      .single()
    if (error || !message) throw new Error(error?.message ?? "Não foi possível editar a mensagem")

    return NextResponse.json({ message: mapMessageRow(message, user.id) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "TicketAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
