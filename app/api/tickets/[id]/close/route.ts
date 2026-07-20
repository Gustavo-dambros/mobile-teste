import { NextResponse } from "next/server"
import { z } from "zod"

import {
  MESSAGE_SELECT,
  TICKET_SELECT,
  canAccessTicket,
  mapMessageRow,
  mapTicketRow,
  requireUser,
} from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ reason: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { reason } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    if (!(await canAccessTicket(user, id))) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }

    const { data: ticket, error } = await admin
      .from("tickets")
      .update({
        status: "Concluído",
        closed_by_id: user.id,
        close_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(TICKET_SELECT)
      .single()
    if (error || !ticket) throw new Error(error?.message ?? "Não foi possível encerrar o chamado")

    const { data: message, error: messageError } = await admin
      .from("ticket_messages")
      .insert({
        ticket_id: id,
        kind: "system",
        author_id: user.id,
        text: `${user.name} encerrou o chamado. Motivo: ${reason}`,
        system_event: "closed",
      })
      .select(MESSAGE_SELECT)
      .single()
    if (messageError || !message) throw new Error(messageError?.message ?? "Não foi possível registrar o encerramento")

    return NextResponse.json({ ticket: mapTicketRow(ticket), message: mapMessageRow(message, user.id) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Informe o motivo do encerramento" }, { status: 400 })
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
