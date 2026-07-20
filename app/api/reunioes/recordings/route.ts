import { NextResponse } from "next/server"

import { listMeetingIdsForUser, requireUser } from "@/lib/reunioes/server"
import { reconcilePendingRecordings } from "@/lib/reunioes/recordings"
import { createAdminClient } from "@/lib/supabase/admin"
import type { MeetingRecording } from "@/lib/reunioes/types"

/** Recordings from meetings the current user hosted, attended, or was invited to —
 * expired ones are excluded (the 24h-cleanup job flips them to status='expired'). */
export async function GET() {
  try {
    const user = await requireUser()
    const meetingIds = await listMeetingIdsForUser(user.id)
    if (meetingIds.length === 0) return NextResponse.json({ recordings: [] })

    await reconcilePendingRecordings()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("meeting_recordings")
      .select(
        "id, meeting_id, status, started_at, ended_at, duration_seconds, file_size_bytes, expires_at, meeting:meetings!meeting_recordings_meeting_id_fkey(title), starter:profiles!meeting_recordings_started_by_id_fkey(name)"
      )
      .in("meeting_id", meetingIds)
      .neq("status", "expired")
      .order("started_at", { ascending: false })
    if (error) throw new Error(error.message)

    const recordings: MeetingRecording[] = (data ?? []).map((row) => {
      const meeting = Array.isArray(row.meeting) ? row.meeting[0] : row.meeting
      const starter = Array.isArray(row.starter) ? row.starter[0] : row.starter
      return {
        id: row.id,
        meetingId: row.meeting_id,
        meetingTitle: meeting?.title ?? "Reunião",
        status: row.status as MeetingRecording["status"],
        startedByName: starter?.name ?? "",
        startedAt: row.started_at,
        endedAt: row.ended_at ?? undefined,
        durationSeconds: row.duration_seconds ?? undefined,
        fileSizeBytes: row.file_size_bytes ?? undefined,
        expiresAt: row.expires_at ?? undefined,
      }
    })

    return NextResponse.json({ recordings })
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
