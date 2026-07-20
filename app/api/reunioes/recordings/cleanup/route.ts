import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

/** Deletes expired recording files from storage and flips their rows to 'expired'. Not
 * user-callable — protected by a shared secret, invoked by the unipar-recordings-cleanup
 * systemd timer on the server (hourly; see the deploy summary for the unit files). */
export async function POST(request: Request) {
  const secret = process.env.RECORDINGS_CLEANUP_SECRET
  if (!secret || request.headers.get("x-cleanup-secret") !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: expired, error } = await admin
    .from("meeting_recordings")
    .select("id, file_path")
    .eq("status", "ready")
    .lt("expires_at", new Date().toISOString())
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!expired || expired.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 })
  }

  const paths = expired.map((r) => r.file_path).filter((p): p is string => !!p)
  if (paths.length > 0) {
    const { error: removeError } = await admin.storage.from("meeting-recordings").remove(paths)
    if (removeError) console.error("[reunioes] cleanup: storage remove failed", removeError)
  }

  const { error: updateError } = await admin
    .from("meeting_recordings")
    .update({ status: "expired" })
    .in(
      "id",
      expired.map((r) => r.id)
    )
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deleted: expired.length })
}
