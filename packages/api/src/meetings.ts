import type { Meeting, CreateMeetingInput } from "@unipar/types"
import { apiFetch } from "./api-fetch"

// ── Meetings ─────────────────────────────────────────────────────

export async function fetchMeetings(): Promise<Meeting[]> {
  return apiFetch<Meeting[]>("/api/reunioes")
}

export async function fetchMeeting(id: string): Promise<Meeting> {
  return apiFetch<Meeting>(`/api/reunioes/${id}`)
}

export async function createMeeting(data: CreateMeetingInput): Promise<Meeting> {
  return apiFetch<Meeting>("/api/reunioes", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function joinMeeting(id: string): Promise<void> {
  await apiFetch(`/api/reunioes/${id}/join`, { method: "POST" })
}

export async function leaveMeeting(id: string, participantId: string): Promise<void> {
  await apiFetch(`/api/reunioes/${id}/leave`, {
    method: "POST",
    body: JSON.stringify({ participantId }),
  })
}

export async function endMeeting(id: string): Promise<void> {
  await apiFetch(`/api/reunioes/${id}/end`, { method: "POST" })
}

export async function getLiveKitToken(
  callId: string
): Promise<{ token: string; url: string }> {
  return apiFetch("/api/livekit/token", {
    method: "POST",
    body: JSON.stringify({ callId }),
  })
}

// ── Invites ──────────────────────────────────────────────────────

export async function fetchInviteNotifications(): Promise<{ notifications: unknown[] }> {
  return apiFetch("/api/reunioes/invite-notifications")
}

export async function respondToInvite(
  notificationId: string,
  accepted: boolean
): Promise<void> {
  await apiFetch(`/api/reunioes/invite-notifications/${notificationId}/respond`, {
    method: "POST",
    body: JSON.stringify({ accepted }),
  })
}

// ── Recordings ───────────────────────────────────────────────────

export async function fetchRecordings(): Promise<{ recordings: unknown[] }> {
  return apiFetch("/api/reunioes/recordings")
}

export async function downloadRecording(id: string): Promise<{ url: string }> {
  return apiFetch(`/api/reunioes/recordings/${id}/download`)
}
