import { NextResponse } from "next/server"
import { z } from "zod"

import { COLUMN_SELECT, mapColumnRow, requireUser } from "@/lib/kanban/server"
import { nextPosition } from "@/lib/kanban/position"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ title: z.string().min(1) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { title } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: board } = await admin.from("kanban_boards").select("user_id").eq("id", id).single()
    if (!board || board.user_id !== user.id) {
      return NextResponse.json({ error: "Quadro não encontrado" }, { status: 404 })
    }

    const { data: siblings, error: siblingsError } = await admin
      .from("kanban_columns")
      .select("position")
      .eq("board_id", id)
    if (siblingsError) throw new Error(siblingsError.message)

    const { data: created, error } = await admin
      .from("kanban_columns")
      .insert({ board_id: id, title: title.trim(), position: nextPosition(siblings ?? []) })
      .select(COLUMN_SELECT)
      .single()
    if (error || !created) throw new Error(error?.message ?? "Não foi possível criar a coluna")

    return NextResponse.json({ column: mapColumnRow(created) })
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
