import { NextResponse } from "next/server"

import { listMeetingIdsForUser, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SIGNED_URL_TTL_SECONDS = 10 * 60

/** Mints a short-lived signed URL for a recording — never a permanent public link.
 * Access is checked against the meetings the requester actually hosted/attended/was
 * invited to, same rule GET /api/reunioes/recordings uses for the list itself. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { data: recording } = await admin
      .from("meeting_recordings")
      .select("id, meeting_id, status, file_path, expires_at")
      .eq("id", id)
      .maybeSingle()
    if (!recording) {
      return NextResponse.json({ error: "Gravação não encontrada" }, { status: 404 })
    }

    const meetingIds = await listMeetingIdsForUser(user.id)
    if (!meetingIds.includes(recording.meeting_id)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }
    if (recording.status === "expired" || (recording.expires_at && new Date(recording.expires_at) < new Date())) {
      return NextResponse.json({ error: "Esta gravação expirou" }, { status: 410 })
    }
    if (recording.status !== "ready" || !recording.file_path) {
      return NextResponse.json({ error: "Gravação ainda não está pronta" }, { status: 409 })
    }

    const { data: signed, error } = await admin.storage
      .from("meeting-recordings")
      .createSignedUrl(recording.file_path, SIGNED_URL_TTL_SECONDS)
    if (error || !signed) throw new Error(error?.message ?? "Não foi possível gerar o link")

    return NextResponse.json({ url: signed.signedUrl })
  } catch (error) {
    if (error instanceof Error && error.name === "ReunioesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
