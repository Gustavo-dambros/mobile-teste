import { NextResponse } from "next/server"
import { z } from "zod"

import { LABEL_SELECT, mapLabelRow, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("kanban_labels")
      .select(LABEL_SELECT)
      .eq("user_id", user.id)
      .order("created_at")
    if (error) throw new Error(error.message)

    return NextResponse.json({ labels: (data ?? []).map(mapLabelRow) })
  } catch (error) {
    if (error instanceof Error && error.name === "KanbanAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}

const bodySchema = z.object({ name: z.string().min(1), color: z.string().min(1) })

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { name, color } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: created, error } = await admin
      .from("kanban_labels")
      .insert({ user_id: user.id, name: name.trim(), color })
      .select(LABEL_SELECT)
      .single()
    if (error || !created) throw new Error(error?.message ?? "Não foi possível criar a etiqueta")

    return NextResponse.json({ label: mapLabelRow(created) })
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
