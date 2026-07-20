import { NextResponse } from "next/server"
import { z } from "zod"

import { getColumnOwner, requireUser } from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ orderedIds: z.array(z.string().uuid()) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { orderedIds } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const owner = await getColumnOwner(id)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 })
    }

    for (let index = 0; index < orderedIds.length; index++) {
      const { error } = await admin
        .from("kanban_cards")
        .update({ position: (index + 1) * 1000 })
        .eq("id", orderedIds[index])
        .eq("column_id", id)
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ ok: true })
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
