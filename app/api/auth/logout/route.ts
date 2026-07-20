import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    // Explicit logout shows Offline immediately instead of waiting out the
    // heartbeat grace window — real disconnects (tab closed, session just
    // expiring) still fall back to that window.
    await createAdminClient().from("profiles").update({ last_active_at: null }).eq("id", user.id)
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
