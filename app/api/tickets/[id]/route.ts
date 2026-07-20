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

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  sector: z
    .enum(["SP-Suporte Técnico", "RH-Recursos Humanos", "ADM-Administração", "SEP-Serviços Escola Psicologia"])
    .optional(),
  assigneeId: z.string().uuid().nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    if (!(await canAccessTicket(user, id))) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }

    const { data: current, error: currentError } = await admin
      .from("tickets")
      .select(TICKET_SELECT)
      .eq("id", id)
      .single()
    if (currentError || !current) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }

    // Assigning/transferring is a staff action — only someone in the
    // ticket's current sector (or an admin) may do it, even though the
    // requester also has general access to the ticket (to edit their own
    // title/description, view the chat, etc).
    const isStaff = current.sector === user.sector || user.role === "ADMIN"
    if ((body.sector !== undefined || body.assigneeId !== undefined) && !isStaff) {
      return NextResponse.json(
        { error: "Apenas colaboradores do setor podem atribuir ou transferir o chamado" },
        { status: 403 }
      )
    }

    // Editing title/description is the requester's own self-service action
    // (see EditTicketDialog, only shown in "Meus Chamados") — canAccessTicket
    // also grants sector staff read/reply access to the same ticket, but that
    // shouldn't extend to rewriting someone else's ticket by guessing its id.
    const isRequester = current.requester_id === user.id || user.role === "ADMIN"
    if ((body.title !== undefined || body.description !== undefined) && !isRequester) {
      return NextResponse.json(
        { error: "Apenas quem abriu o chamado pode editar o título ou a descrição" },
        { status: 403 }
      )
    }

    const changes: Record<string, unknown> = {}
    const systemMessages: string[] = []

    if (body.title !== undefined && body.title !== current.title) {
      changes.title = body.title
      systemMessages.push(`${user.name} alterou o título do chamado.`)
    }
    if (body.description !== undefined && body.description !== current.description) {
      changes.description = body.description
      systemMessages.push(`${user.name} alterou a descrição do chamado.`)
    }
    if (body.sector !== undefined && body.sector !== current.sector) {
      changes.sector = body.sector
      systemMessages.push(`${user.name} transferiu o chamado para o setor ${body.sector}.`)
    }
    if (body.assigneeId !== undefined && body.assigneeId !== current.assignee_id) {
      changes.assignee_id = body.assigneeId
      if (body.assigneeId) {
        const { data: assignee } = await admin
          .from("profiles")
          .select("name")
          .eq("id", body.assigneeId)
          .eq("status", "ACTIVE")
          .is("deleted_at", null)
          .single()
        if (!assignee) {
          return NextResponse.json(
            { error: "Colaborador não encontrado ou inativo" },
            { status: 400 }
          )
        }
        systemMessages.push(`${user.name} atribuiu o chamado para ${assignee.name}.`)
        if (current.status === "Aberto") changes.status = "Em andamento"
      } else {
        systemMessages.push(`${user.name} removeu a atribuição do chamado.`)
      }
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ ticket: mapTicketRow(current), messages: [] })
    }

    changes.updated_at = new Date().toISOString()

    // "Assumir" (claiming an unassigned ticket) is a race: two staff can both read
    // assignee_id as null and both decide to claim it. Guard the write itself with a
    // conditional WHERE, not just the read above, so only the first request actually
    // lands — the loser gets a clear conflict instead of silently overwriting the winner.
    const isClaiming = body.assigneeId !== undefined && body.assigneeId !== null && current.assignee_id === null
    let updateQuery = admin.from("tickets").update(changes).eq("id", id)
    if (isClaiming) updateQuery = updateQuery.is("assignee_id", null)

    const { data: updated, error: updateError } = await updateQuery.select(TICKET_SELECT).maybeSingle()
    if (updateError) throw new Error(updateError.message)
    if (!updated) {
      if (isClaiming) {
        return NextResponse.json(
          { error: "Este chamado já foi assumido por outro colaborador." },
          { status: 409 }
        )
      }
      throw new Error("Não foi possível atualizar o chamado")
    }

    const { data: messages, error: messagesError } = await admin
      .from("ticket_messages")
      .insert(
        systemMessages.map((text) => ({
          ticket_id: id,
          kind: "system",
          author_id: user.id,
          text,
        }))
      )
      .select(MESSAGE_SELECT)
    if (messagesError) throw new Error(messagesError.message)

    return NextResponse.json({
      ticket: mapTicketRow(updated),
      messages: (messages ?? []).map((m) => mapMessageRow(m, user.id)),
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
