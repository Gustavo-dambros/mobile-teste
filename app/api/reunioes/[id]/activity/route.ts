import { NextResponse } from "next/server"

import { ReunioesHostError, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const ACTIVITY_LIMIT = 50

/** Host-only feed of meeting_admin_actions — every host action (mute, remove, lock
 * mic/camera, recording, link rotation...) is already logged there; this is the first
 * place that actually reads it back. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    await requireHostMeeting(id, user)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("meeting_admin_actions")
      .select("id, action, target_label, created_at, actor:profiles!meeting_admin_actions_actor_id_fkey(name)")
      .eq("meeting_id", id)
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT)
    if (error) throw new Error(error.message)

    const activity = (data ?? []).map((row) => {
      const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor
      return {
        id: row.id,
        action: row.action,
        targetLabel: row.target_label,
        actorName: actor?.name ?? "",
        createdAt: row.created_at,
      }
    })

    return NextResponse.json({ activity })
  } catch (error) {
    if (error instanceof ReunioesHostError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.name === "ReunioesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
