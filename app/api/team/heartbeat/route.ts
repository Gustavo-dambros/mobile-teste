import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Called on an interval by every logged-in client (see lib/team/use-heartbeat.ts)
 * so `profiles.last_active_at` reflects "is this person actually using the
 * app right now" — the only real signal behind the Online/Offline dot on the
 * team page and dashboard. No heartbeat for ~90s (see ONLINE_THRESHOLD_MS in
 * lib/team/presence-labels.ts) and they show Offline, regardless of whatever
 * presence_status they last picked manually.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
