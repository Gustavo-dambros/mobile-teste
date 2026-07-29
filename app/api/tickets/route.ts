import { NextResponse } from "next/server"
import { z } from "zod"

import { MESSAGE_SELECT, TICKET_SELECT, mapMessageRow, mapTicketRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createTicketSchema } from "@unipar/validation"

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    const admin = createAdminClient()

    let query = admin
      .from("tickets")
      .select(TICKET_SELECT)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
    if (user.role !== "ADMIN") {
      query = query.or(`requester_id.eq.${user.id},sector.eq.${user.sector}`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ tickets: (data ?? []).map(mapTicketRow) })
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

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = createTicketSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: ticket, error } = await admin
      .from("tickets")
      .insert({
        title: body.title,
        description: body.description,
        priority: body.priority,
        sector: body.sector,
        requester_id: user.id,
        status: "Aberto",
        attachments: body.attachments,
      })
      .select(TICKET_SELECT)
      .single()
    if (error || !ticket) throw new Error(error?.message ?? "Não foi possível abrir o chamado")

    const { data: message, error: messageError } = await admin
      .from("ticket_messages")
      .insert({
        ticket_id: ticket.id,
        kind: "system",
        author_id: user.id,
        text: `Chamado aberto por ${user.name}.`,
      })
      .select(MESSAGE_SELECT)
      .single()
    if (messageError || !message) throw new Error(messageError?.message ?? "Não foi possível registrar o chamado")

    return NextResponse.json({
      ticket: mapTicketRow(ticket),
      message: mapMessageRow(message, user.id),
    })
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
