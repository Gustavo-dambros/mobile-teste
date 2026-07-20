import { NextResponse } from "next/server"
import { z } from "zod"

import { EXTENSION_SELECT, mapExtensionRow } from "@/lib/extensions/server"
import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  sector: z.string().optional(),
  number: z.string().min(1).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem editar ramais" }, { status: 403 })
    }
    const { id } = await params
    const changes = patchSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("extensions")
      .update(changes)
      .eq("id", id)
      .select(EXTENSION_SELECT)
      .single()
    if (error || !data) throw new Error(error?.message ?? "Não foi possível atualizar o ramal")

    return NextResponse.json({ extension: mapExtensionRow(data) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem excluir ramais" }, { status: 403 })
    }
    const { id } = await params
    const admin = createAdminClient()

    const { error } = await admin.from("extensions").delete().eq("id", id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
