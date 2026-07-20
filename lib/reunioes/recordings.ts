import "server-only"

import { readFile, unlink } from "fs/promises"
import path from "path"
import { EgressStatus, type EgressInfo } from "livekit-server-sdk"

import { getEgressClient, recordingsDir } from "@/lib/reunioes/egress"
import { createAdminClient } from "@/lib/supabase/admin"

const RECORDING_EXPIRY_HOURS = 24

interface PendingRecordingRow {
  id: string
  egress_id: string
  local_path: string | null
}

/** Moves a finished egress's local file into Supabase Storage and flips the DB row to
 * 'ready' (or 'failed' when the egress didn't end in EGRESS_COMPLETE) — shared by the
 * webhook (lib/reunioes/../egress-webhook, when LiveKit can reach this app) and
 * reconcilePendingRecordings below (poll-based fallback for when it can't). */
export async function finalizeEgressResult(recording: PendingRecordingRow, info: EgressInfo) {
  const admin = createAdminClient()

  if (info.status !== EgressStatus.EGRESS_COMPLETE || !recording.local_path) {
    await admin
      .from("meeting_recordings")
      .update({ status: "failed", ended_at: new Date().toISOString() })
      .eq("id", recording.id)
    return
  }

  try {
    const localFile = path.join(recordingsDir(), recording.local_path)
    const bytes = await readFile(localFile)
    const storagePath = recording.local_path

    const { error: uploadError } = await admin.storage
      .from("meeting-recordings")
      .upload(storagePath, bytes, { contentType: "video/mp4", upsert: true })
    if (uploadError) throw new Error(uploadError.message)

    await unlink(localFile).catch(() => {
      // best-effort cleanup — the 24h cleanup job will also skip storage-only rows fine
    })

    const fileResult = info.fileResults[0]
    const durationSeconds = fileResult ? Number(fileResult.duration) / 1_000_000_000 : undefined
    const sizeBytes = fileResult ? Number(fileResult.size) : bytes.byteLength
    const endedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + RECORDING_EXPIRY_HOURS * 60 * 60_000).toISOString()

    await admin
      .from("meeting_recordings")
      .update({
        status: "ready",
        file_path: storagePath,
        file_size_bytes: sizeBytes,
        duration_seconds: durationSeconds ? Math.round(durationSeconds) : null,
        ended_at: endedAt,
        expires_at: expiresAt,
      })
      .eq("id", recording.id)
  } catch (error) {
    console.error("[reunioes] failed to process finished recording", error)
    await admin
      .from("meeting_recordings")
      .update({ status: "failed", ended_at: new Date().toISOString() })
      .eq("id", recording.id)
  }
}

/** Requests egress to stop for whatever's actively recording in a meeting that's about
 * to end (manual "Encerrar para todos", or the auto-end-on-timeout check) — shared so
 * both paths flip the row to 'processing' the same way instead of leaving egress running
 * against a room nobody's about to be in. Best-effort: swallows egress errors since the
 * meeting must still end either way. */
export async function stopActiveRecordingForMeeting(meetingId: string) {
  const admin = createAdminClient()
  const { data: activeRecording } = await admin
    .from("meeting_recordings")
    .select("id, egress_id")
    .eq("meeting_id", meetingId)
    .eq("status", "recording")
    .maybeSingle()
  if (!activeRecording) return

  try {
    await getEgressClient().stopEgress(activeRecording.egress_id)
    await admin.from("meeting_recordings").update({ status: "processing" }).eq("id", activeRecording.id)
  } catch (error) {
    console.error("[reunioes] failed to stop recording on meeting end", error)
  }
}

const TERMINAL_STATUSES = new Set([
  EgressStatus.EGRESS_COMPLETE,
  EgressStatus.EGRESS_FAILED,
  EgressStatus.EGRESS_ABORTED,
  EgressStatus.EGRESS_LIMIT_REACHED,
])

/** Fallback for environments where LiveKit's egress_ended webhook can't reach this app
 * (e.g. the livekit-server container can't route to the host's Next.js process — see
 * AUDITORIA notes) — actively asks LiveKit for the real status of anything still stuck
 * in 'processing' instead of waiting forever for a callback that may never arrive. Cheap
 * once nothing is pending, so it's safe to call from any request that touches recordings
 * (the recordings list, and the guest-safe per-meeting recording status route). */
export async function reconcilePendingRecordings(meetingId?: string) {
  const admin = createAdminClient()
  let query = admin.from("meeting_recordings").select("id, egress_id, local_path").eq("status", "processing")
  if (meetingId) query = query.eq("meeting_id", meetingId)
  const { data: pending } = await query
  if (!pending || pending.length === 0) return

  let egress
  try {
    egress = getEgressClient()
  } catch {
    return
  }

  await Promise.all(
    pending.map(async (recording) => {
      try {
        const [info] = await egress.listEgress({ egressId: recording.egress_id })
        if (info && TERMINAL_STATUSES.has(info.status)) {
          await finalizeEgressResult(recording, info)
        }
      } catch (error) {
        console.error("[reunioes] failed to reconcile recording", recording.id, error)
      }
    })
  )
}
