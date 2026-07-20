import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/administracao/server-actions"
import { createAdminClient } from "@/lib/supabase/admin"

type Embed<T> = T | T[] | null
function one<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

interface ReportRow {
  id: string
  reason: string
  description: string | null
  created_at: string
  reporter: Embed<{ name: string }>
  message: Embed<{
    id: string
    text: string
    ticket_id: string
    deleted_for_everyone: boolean
    created_at: string
    author: Embed<{ name: string }>
    ticket: Embed<{ number: number; title: string }>
  }>
}

export async function GET() {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("reported_messages")
      .select(
        `
        id, reason, description, created_at,
        reporter:profiles!reported_messages_reporter_id_fkey(name),
        message:ticket_messages!reported_messages_message_id_fkey(
          id, text, ticket_id, deleted_for_everyone, created_at,
          author:profiles!ticket_messages_author_id_fkey(name),
          ticket:tickets!ticket_messages_ticket_id_fkey(number, title)
        )
      `
      )
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)

    const reports = ((data ?? []) as unknown as ReportRow[]).map((row) => {
      const reporter = one(row.reporter)
      const message = one(row.message)
      const ticket = message ? one(message.ticket) : null
      const author = message ? one(message.author) : null
      return {
        id: row.id,
        reason: row.reason,
        description: row.description ?? undefined,
        createdAt: row.created_at,
        reporterName: reporter?.name ?? "",
        messageText: message?.deleted_for_everyone ? "(mensagem apagada)" : (message?.text ?? "(mensagem removida)"),
        messageAuthorName: author?.name ?? "",
        ticketId: message?.ticket_id,
        ticketNumber: ticket ? `CH-${String(ticket.number).padStart(4, "0")}` : undefined,
        ticketTitle: ticket?.title,
      }
    })

    return NextResponse.json({ reports })
  } catch (error) {
    if (error instanceof Error && error.name === "AdminAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
