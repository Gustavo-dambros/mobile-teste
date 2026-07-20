"use client"

import { createBroadcastChannel } from "@/lib/realtime/broadcast-channel"

const MEETING_UPDATED_EVENT = "meeting-updated"
const MEETING_SYSTEM_NOTE_EVENT = "meeting-system-note"

export interface MeetingSystemNote {
  meetingId: string
  message: string
}

const channel = createBroadcastChannel("reunioes-activity")

// Payload is just the id, never the meeting itself — this channel has no per-meeting
// authorization (a Supabase Realtime broadcast channel is joinable by anyone holding
// the public anon key, i.e. anyone with the site open), so broadcasting the full
// Meeting used to hand chat content and the invite token to every listener regardless
// of whether they belonged to that meeting. Recipients now re-fetch over the
// authenticated REST API instead of trusting broadcast content directly.
export function broadcastMeetingUpdated(meetingId: string) {
  return channel.send(MEETING_UPDATED_EVENT, { meetingId })
}

/** Ephemeral, best-effort ("Fulano silenciou todos") — not persisted, so it only reaches
 * clients whose broadcast channel connected; the poll fallback never replays it, which is
 * fine since it's an informational toast, not state that needs to be consistent. */
export function broadcastMeetingSystemNote(note: MeetingSystemNote) {
  return channel.send(MEETING_SYSTEM_NOTE_EVENT, note)
}

export function useMeetingSystemNote(onNote: (note: MeetingSystemNote) => void) {
  channel.useSubscription({
    [MEETING_SYSTEM_NOTE_EVENT]: (payload) => onNote(payload as MeetingSystemNote),
  })
}

/** Notifies the caller which meeting changed — just the id, see broadcastMeetingUpdated
 * for why. The caller decides whether/how to re-fetch (only meetings it already knows
 * about; new meetings still arrive via the list poll). */
export function useMeetingActivity(onMeetingUpdated: (meetingId: string) => void) {
  channel.useSubscription({
    [MEETING_UPDATED_EVENT]: (payload) => onMeetingUpdated((payload as { meetingId: string }).meetingId),
  })
}
