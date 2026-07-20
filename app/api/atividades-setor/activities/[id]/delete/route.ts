import { NextResponse } from "next/server"

import { canDeleteEvent } from "@/lib/atividades-setor/permissions"
import { ACTIVITY_SELECT, addHistory, mapActivityRow, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: current } = await admin.from("activities").select("creator_id, deleted_at").eq("id", id).single()
    if (!current) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    if (!canDeleteEvent(user, { creatorId: current.creator_id })) {
      return NextResponse.json({ error: "Você não tem permissão para excluir esta atividade" }, { status: 403 })
    }
    if (current.deleted_at) {
      const { data: existing } = await admin.from("activities").select(ACTIVITY_SELECT).eq("id", id).single()
      return NextResponse.json({ activity: existing ? mapActivityRow(existing) : null })
    }

    const { data: activity, error } = await admin
      .from("activities")
      .update({ deleted_at: new Date().toISOString(), deleted_by_id: user.id })
      .eq("id", id)
      .select(ACTIVITY_SELECT)
      .single()
    if (error || !activity) throw new Error(error?.message ?? "Não foi possível excluir a atividade")

    await addHistory(admin, { entityType: "event", entityId: id, actorId: user.id, action: "event_cancelled" })

    return NextResponse.json({ activity: mapActivityRow(activity) })
  } catch (error) {
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
