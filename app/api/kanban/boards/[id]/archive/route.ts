import { NextResponse } from "next/server"
import { z } from "zod"

import { BOARD_SELECT, mapBoardRow, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ archived: z.boolean() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { archived } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: board } = await admin.from("kanban_boards").select("user_id").eq("id", id).single()
    if (!board || board.user_id !== user.id) {
      return NextResponse.json({ error: "Quadro não encontrado" }, { status: 404 })
    }

    const { data: updated, error } = await admin
      .from("kanban_boards")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id)
      .select(BOARD_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível atualizar o quadro")

    return NextResponse.json({ board: mapBoardRow(updated) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "KanbanAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
