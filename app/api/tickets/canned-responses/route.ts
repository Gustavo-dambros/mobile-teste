import { NextResponse } from "next/server"
import { z } from "zod"

import { CANNED_SELECT, mapCannedResponseRow, requireUser } from "@/lib/tickets/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    let query = admin.from("ticket_canned_responses").select(CANNED_SELECT).order("title", { ascending: true })
    if (user.role !== "ADMIN") {
      query = query.or(`sector.is.null,sector.eq.${user.sector}`)
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ responses: (data ?? []).map(mapCannedResponseRow) })
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

const bodySchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  global: z.boolean().default(false),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = bodySchema.parse(await request.json())
    if (input.global && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem criar respostas globais" }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("ticket_canned_responses")
      .insert({
        title: input.title,
        body: input.body,
        sector: input.global ? null : user.sector,
        created_by_id: user.id,
      })
      .select(CANNED_SELECT)
      .single()
    if (error || !data) throw new Error(error?.message ?? "Não foi possível criar a resposta pronta")

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
