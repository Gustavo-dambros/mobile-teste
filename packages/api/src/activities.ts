import type { Task, CalendarEvent } from "@unipar/types"
import { apiFetch } from "./api-fetch"

// ── Activities (Events) ──────────────────────────────────────────

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>("/api/atividades-setor/activities")
}

export async function fetchEvent(id: string): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/atividades-setor/activities/${id}`)
}

export async function createEvent(
  data: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>("/api/atividades-setor/activities", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateEvent(
  id: string,
  data: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/atividades-setor/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch(`/api/atividades-setor/activities/${id}/delete`, { method: "POST" })
}

// ── Tasks ────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  return apiFetch<Task[]>("/api/atividades-setor/tasks")
}

export async function fetchTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/api/atividades-setor/tasks/${id}`)
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  return apiFetch<Task>("/api/atividades-setor/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return apiFetch<Task>(`/api/atividades-setor/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function updateTaskStatus(id: string, status: string): Promise<void> {
  await apiFetch(`/api/atividades-setor/tasks/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  })
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/api/atividades-setor/tasks/${id}/delete`, { method: "POST" })
}

export async function archiveTask(id: string): Promise<void> {
  await apiFetch(`/api/atividades-setor/tasks/${id}/archive`, { method: "POST" })
}

export async function restoreTask(id: string): Promise<void> {
  await apiFetch(`/api/atividades-setor/tasks/${id}/restore`, { method: "POST" })
}

export async function duplicateTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/api/atividades-setor/tasks/${id}/duplicate`, { method: "POST" })
}

// ── Notes / Comments ─────────────────────────────────────────────

export async function fetchTaskComments(taskId: string): Promise<{ comments: unknown[] }> {
  return apiFetch(`/api/atividades-setor/tasks/${taskId}/comments`)
}

export async function addTaskComment(
  taskId: string,
  text: string
): Promise<{ comment: unknown }> {
  return apiFetch(`/api/atividades-setor/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  })
}

// ── History ─────────────────────────────────────────────────────

export async function fetchTaskHistory(
  taskId: string
): Promise<{ history: unknown[] }> {
  return apiFetch(`/api/atividades-setor/tasks/${taskId}/history`)
}
