import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  reason: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { id } = await params
    const body = bodySchema.parse(await request.json())

    if (id === user.id) {
      return NextResponse.json({ error: "Você não pode denunciar a si mesmo" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: target } = await admin
      .from("profiles")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()
    if (!target) {
      return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 })
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentReport } = await admin
      .from("reported_members")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("reported_user_id", id)
      .gte("created_at", oneDayAgo)
      .maybeSingle()
    if (recentReport) {
      return NextResponse.json(
        { error: "Você já denunciou este colaborador recentemente. Tente novamente mais tarde." },
        { status: 429 }
      )
    }

    const { error } = await admin.from("reported_members").insert({
      reported_user_id: id,
      reporter_id: user.id,
      reason: body.reason,
      description: body.description ?? null,
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
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
