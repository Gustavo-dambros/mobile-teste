import { NextResponse } from "next/server"
import { z } from "zod"

import { EXTENSION_SELECT, mapExtensionRow } from "@/lib/extensions/server"
import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("extensions")
      .select(EXTENSION_SELECT)
      .order("sector", { ascending: true })
      .order("name", { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({ extensions: (data ?? []).map(mapExtensionRow) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}

const bodySchema = z.object({
  name: z.string().min(1),
  sector: z.string().optional(),
  number: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem cadastrar ramais" }, { status: 403 })
    }
    const input = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("extensions")
      .insert({ name: input.name, sector: input.sector ?? null, number: input.number })
      .select(EXTENSION_SELECT)
      .single()
    if (error || !data) throw new Error(error?.message ?? "Não foi possível cadastrar o ramal")

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
