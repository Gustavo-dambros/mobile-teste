import { NextResponse } from "next/server"

import { reconcilePendingRecordings } from "@/lib/reunioes/recordings"
import { createAdminClient } from "@/lib/supabase/admin"

const SIGNED_URL_TTL_SECONDS = 10 * 60

/** Meeting-scoped, guest-reachable recording status — no requireUser() (guests have no
 * session), same meetingId+participantId trust model as /media, /chat, /leave. Anyone who
 * was ever a participant (left_at set or not — this backs the "baixar gravação?" prompt
 * shown right as someone is leaving) can check whether their meeting was recorded and, once
 * ready, get a short-lived download URL. Doesn't leak to people who were never in the room:
 * a participantId that doesn't belong to this meeting gets 404. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const participantId = new URL(request.url).searchParams.get("participantId")
    if (!participantId) {
      return NextResponse.json({ error: "participantId é obrigatório" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: participant } = await admin
      .from("meeting_participants")
      .select("id")
      .eq("id", participantId)
      .eq("meeting_id", id)
      .maybeSingle()
    if (!participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }

    await reconcilePendingRecordings(id)

    const { data: recording } = await admin
      .from("meeting_recordings")
      .select("id, status, file_path, expires_at")
      .eq("meeting_id", id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!recording) {
      return NextResponse.json({ recording: null })
    }

    if (recording.status !== "ready" || !recording.file_path) {
      return NextResponse.json({ recording: { id: recording.id, status: recording.status } })
    }

    const { data: signed, error } = await admin.storage
      .from("meeting-recordings")
      .createSignedUrl(recording.file_path, SIGNED_URL_TTL_SECONDS)
    if (error || !signed) throw new Error(error?.message ?? "Não foi possível gerar o link")

    return NextResponse.json({
      recording: { id: recording.id, status: recording.status },
      url: signed.signedUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
