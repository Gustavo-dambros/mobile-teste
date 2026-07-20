import { NextResponse } from "next/server"

import { MESSAGE_SELECT, mapMessageRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, messageId } = await params
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("ticket_messages")
      .select("author_id")
      .eq("id", messageId)
      .eq("ticket_id", id)
      .single()
    if (!existing || existing.author_id !== user.id) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    const { data: message, error } = await admin
      .from("ticket_messages")
      .update({ deleted_for_everyone: true, text: "" })
      .eq("id", messageId)
      .eq("ticket_id", id)
      .select(MESSAGE_SELECT)
      .single()
    if (error || !message) throw new Error(error?.message ?? "Não foi possível excluir a mensagem")

    return NextResponse.json({ message: mapMessageRow(message, user.id) })
  } catch (error) {
    if (error instanceof Error && error.name === "TicketAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
