import type { Meeting, CreateMeetingInput } from "@unipar/types"

const API_BASE = "/api"

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

// ── Meetings ─────────────────────────────────────────────────────

export async function fetchMeetings(): Promise<Meeting[]> {
  return apiFetch<Meeting[]>("/reunioes")
}

export async function fetchMeeting(id: string): Promise<Meeting> {
  return apiFetch<Meeting>(`/reunioes/${id}`)
}

export async function createMeeting(data: CreateMeetingInput): Promise<Meeting> {
  return apiFetch<Meeting>("/reunioes", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function joinMeeting(id: string): Promise<void> {
  await apiFetch(`/reunioes/${id}/join`, { method: "POST" })
}

export async function leaveMeeting(id: string): Promise<void> {
  await apiFetch(`/reunioes/${id}/leave`, { method: "POST" })
}

export async function endMeeting(id: string): Promise<void> {
  await apiFetch(`/reunioes/${id}/end`, { method: "POST" })
}

export async function getLiveKitToken(
  meetingId: string
): Promise<{ token: string; url: string }> {
  return apiFetch("/reunioes/livekit-token", {
    method: "POST",
    body: JSON.stringify({ meetingId }),
  })
}
