import { NextResponse } from "next/server"
import { z } from "zod"

import { TICKET_SELECT, mapTicketRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { rating, comment } = bodySchema.parse(await request.json())

    const admin = createAdminClient()
    const { data: ticket } = await admin
      .from("tickets")
      .select("requester_id, status, satisfaction_rating")
      .eq("id", id)
      .single()
    if (!ticket) return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    if (ticket.requester_id !== user.id) {
      return NextResponse.json({ error: "Apenas quem abriu o chamado pode avaliar" }, { status: 403 })
    }
    if (ticket.status !== "Concluído") {
      return NextResponse.json({ error: "O chamado ainda não foi encerrado" }, { status: 400 })
    }
    if (ticket.satisfaction_rating !== null) {
      return NextResponse.json({ error: "Este chamado já foi avaliado" }, { status: 409 })
    }

    const { data, error } = await admin
      .from("tickets")
      .update({ satisfaction_rating: rating, satisfaction_comment: comment ?? null })
      .eq("id", id)
      .is("satisfaction_rating", null)
      .select(TICKET_SELECT)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Este chamado já foi avaliado" }, { status: 409 })

    return NextResponse.json({ ticket: mapTicketRow(data) })
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
