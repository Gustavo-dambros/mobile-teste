import type { Task, CalendarEvent } from "@unipar/types"

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

// ── Tasks ────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  return apiFetch<Task[]>("/atividades-setor/tasks")
}

export async function fetchTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/atividades-setor/tasks/${id}`)
}

export async function updateTaskStatus(
  id: string,
  status: string
): Promise<void> {
  await apiFetch(`/atividades-setor/tasks/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  })
}

// ── Events ───────────────────────────────────────────────────────

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>("/atividades-setor/activities")
}

export async function fetchEvent(id: string): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/atividades-setor/activities/${id}`)
}
