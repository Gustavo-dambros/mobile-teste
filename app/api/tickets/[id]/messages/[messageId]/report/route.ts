import { NextResponse } from "next/server"
import { z } from "zod"

import { canAccessTicket, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  reason: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await requireUser()
    const { id, messageId } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    if (!(await canAccessTicket(user, id))) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }

    const { data: existing } = await admin
      .from("ticket_messages")
      .select("id")
      .eq("id", messageId)
      .eq("ticket_id", id)
      .single()
    if (!existing) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    const { error } = await admin.from("reported_messages").insert({
      message_id: messageId,
      reporter_id: user.id,
      reason: body.reason,
      description: body.description ?? null,
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
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
