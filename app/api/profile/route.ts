import { NextResponse } from "next/server"
import { z } from "zod"

import {
  presenceStatusSchema,
  statusMessageSchema,
  workActivityStatusSchema,
} from "@/components/profile/types"
import { createClient } from "@/lib/supabase/server"

const bodySchema = z.object({
  presenceStatus: presenceStatusSchema,
  workActivityStatus: workActivityStatusSchema,
  statusMessage: statusMessageSchema,
})

export async function PATCH(request: Request) {
  try {
    const body = bodySchema.parse(await request.json())
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update({
        presence_status: body.presenceStatus,
        work_activity_status: body.workActivityStatus,
        status_message: body.statusMessage,
      })
      .eq("id", user.id)
      .select("presence_status, work_activity_status, status_message")
      .single()
    if (error || !profile) throw new Error(error?.message ?? "Não foi possível salvar o perfil")

    return NextResponse.json({
      presenceStatus: profile.presence_status,
      workActivityStatus: profile.work_activity_status,
      statusMessage: profile.status_message,
    })
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
