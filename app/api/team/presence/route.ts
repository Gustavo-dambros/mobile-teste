import { NextResponse } from "next/server"

import { getCurrentUserFromRequest } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ACTIVITY_LABEL, computePresenceLabel } from "@/lib/team/presence-labels"

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("profiles")
    .select("id, presence_status, work_activity_status, last_active_at")
    .is("deleted_at", null)
    .eq("status", "ACTIVE")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    members: (data ?? []).map((row) => ({
      id: row.id,
      presence: computePresenceLabel(row.presence_status, row.last_active_at),
      activity: ACTIVITY_LABEL[row.work_activity_status] ?? row.work_activity_status,
    })),
  })
}
