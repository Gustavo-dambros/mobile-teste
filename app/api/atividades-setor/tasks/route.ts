import { NextResponse } from "next/server"

import { isSystemAdmin } from "@/lib/atividades-setor/permissions"
import { mapTaskRow, requireUser, TASK_SELECT } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Refetched in full on every poll (lib/atividades-setor/store.tsx) — this
// caps the pathological case of years of accumulated tasks, well above any
// realistic real-world count.
const MAX_TASKS = 2000

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    let query = admin.from("activity_tasks").select(TASK_SELECT)
    if (!isSystemAdmin(user)) {
      query = query.is("deleted_at", null)
      const orParts = [
        `creator_id.eq.${user.id}`,
        `assignee_id.eq.${user.id}`,
        `watcher_ids.cs.{${user.id}}`,
      ]
      if (user.isSectorLeader) orParts.push(`sector.eq.${user.sector}`)
      query = query.or(orParts.join(","))
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(MAX_TASKS)
    if (error) throw new Error(error.message)

    return NextResponse.json({ tasks: (data ?? []).map(mapTaskRow) })
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
