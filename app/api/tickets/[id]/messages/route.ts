import { NextResponse } from "next/server"
import { z } from "zod"

import { MESSAGE_SELECT, applySeenStatus, canAccessTicket, mapMessageRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Soft cap so a very long-lived ticket doesn't re-download its entire history
// on every 12s poll/realtime ping — the client already only *renders* the
// last 40 (see TicketChatPage's PAGE_SIZE), this just bounds what's fetched.
const MAX_MESSAGES = 300

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!(await canAccessTicket(user, id))) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const [{ data, error }, { data: readStates }] = await Promise.all([
      admin
        .from("ticket_messages")
        .select(MESSAGE_SELECT)
        .eq("ticket_id", id)
        .order("created_at", { ascending: false })
        .limit(MAX_MESSAGES),
      admin.from("ticket_read_state").select("user_id, last_seen_at").eq("ticket_id", id),
    ])
    if (error) throw new Error(error.message)

    const messages = applySeenStatus(
      (data ?? []).reverse().map((m) => mapMessageRow(m, user.id)),
      readStates ?? [],
      user.id
    )

    return NextResponse.json({ messages })
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

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  kind: z.enum(["image", "video", "document"]),
  mimeType: z.string(),
  url: z.string(),
})

const bodySchema = z
  .object({
    text: z.string().default(""),
    replyToId: z.string().uuid().optional(),
    attachments: z.array(attachmentSchema).default([]),
  })
  .refine((data) => data.text.trim().length > 0 || data.attachments.length > 0, {
    message: "Envie um texto ou pelo menos um anexo",
  })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())

    if (!(await canAccessTicket(user, id))) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: message, error } = await admin
      .from("ticket_messages")
      .insert({
        ticket_id: id,
        kind: "message",
        author_id: user.id,
        text: body.text,
        reply_to_id: body.replyToId ?? null,
        attachments: body.attachments,
      })
      .select(MESSAGE_SELECT)
      .single()
    if (error || !message) throw new Error(error?.message ?? "Não foi possível enviar a mensagem")

    const { data: ticket } = await admin
      .from("tickets")
      .select("requester_id, first_response_at")
      .eq("id", id)
      .single()
    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (ticket && !ticket.first_response_at && user.id !== ticket.requester_id) {
      changes.first_response_at = message.created_at
    }
    await admin.from("tickets").update(changes).eq("id", id)

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
