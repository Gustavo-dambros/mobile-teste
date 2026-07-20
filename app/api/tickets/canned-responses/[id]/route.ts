import { NextResponse } from "next/server"
import { z } from "zod"

import { CANNED_SELECT, mapCannedResponseRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const changes = patchSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("ticket_canned_responses")
      .select("created_by_id")
      .eq("id", id)
      .single()
    if (!existing) return NextResponse.json({ error: "Resposta não encontrada" }, { status: 404 })
    if (existing.created_by_id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem permissão para editar esta resposta" }, { status: 403 })
    }

    const { data, error } = await admin
      .from("ticket_canned_responses")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(CANNED_SELECT)
      .single()
    if (error || !data) throw new Error(error?.message ?? "Não foi possível atualizar a resposta")

    return NextResponse.json({ response: mapCannedResponseRow(data) })
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("ticket_canned_responses")
      .select("created_by_id")
      .eq("id", id)
      .single()
    if (!existing) return NextResponse.json({ error: "Resposta não encontrada" }, { status: 404 })
    if (existing.created_by_id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem permissão para excluir esta resposta" }, { status: 403 })
    }

    const { error } = await admin.from("ticket_canned_responses").delete().eq("id", id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
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
