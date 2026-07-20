import { NextResponse } from "next/server"
import { z } from "zod"

import { TICKET_SELECT, mapTicketRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ reason: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { reason } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    // Deleting is the requester's own self-service action (see
    // DeleteTicketDialog, only shown in "Meus Chamados") — not a general
    // sector-staff action, unlike close/reopen which staff also use from the
    // Fila/Histórico screens.
    const { data: existing } = await admin
      .from("tickets")
      .select("requester_id, deleted")
      .eq("id", id)
      .single()
    if (!existing || existing.deleted) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }
    if (existing.requester_id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas quem abriu o chamado pode excluí-lo" },
        { status: 403 }
      )
    }

    const { data: ticket, error } = await admin
      .from("tickets")
      .update({ deleted: true, delete_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(TICKET_SELECT)
      .single()
    if (error || !ticket) throw new Error(error?.message ?? "Não foi possível excluir o chamado")

    return NextResponse.json({ ticket: mapTicketRow(ticket) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Informe o motivo da exclusão" }, { status: 400 })
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
