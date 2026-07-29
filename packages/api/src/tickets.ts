import type { Ticket, TicketMessage, CannedResponse } from "@unipar/types"
import { apiFetch } from "./api-fetch"

// ── Tickets ──────────────────────────────────────────────────────

export async function fetchTickets(): Promise<Ticket[]> {
  return apiFetch<Ticket[]>("/api/tickets")
}

export async function fetchTicket(id: string): Promise<Ticket> {
  return apiFetch<Ticket>(`/api/tickets/${id}`)
}

export async function createTicket(data: {
  title: string
  description: string
  sector: string
  priority: string
  attachments?: { id: string; name: string; url: string; size: number; kind: string }[]
}): Promise<Ticket> {
  return apiFetch<Ticket>("/api/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateTicket(
  id: string,
  data: { title?: string; description?: string; sector?: string; assigneeId?: string | null }
): Promise<{ ticket: Ticket; messages: TicketMessage[] }> {
  return apiFetch(`/api/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function closeTicket(id: string, reason: string): Promise<{ ticket: Ticket; message: TicketMessage }> {
  return apiFetch(`/api/tickets/${id}/close`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

export async function reopenTicket(id: string, reason: string): Promise<{ ticket: Ticket; message: TicketMessage }> {
  return apiFetch(`/api/tickets/${id}/reopen`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

export async function deleteTicket(id: string, reason: string): Promise<{ ticket: Ticket }> {
  return apiFetch(`/api/tickets/${id}/delete`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

export async function rateTicket(
  id: string,
  rating: number,
  comment?: string
): Promise<{ ticket: Ticket }> {
  return apiFetch(`/api/tickets/${id}/satisfaction`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  })
}

// ── Ticket Messages ──────────────────────────────────────────────

export async function fetchTicketMessages(ticketId: string): Promise<{ messages: TicketMessage[] }> {
  return apiFetch(`/api/tickets/${ticketId}/messages`)
}

export async function sendTicketMessage(
  ticketId: string,
  text: string,
  replyToId?: string,
  attachments?: { id: string; name: string; url: string; size: number; kind: string }[]
): Promise<{ message: TicketMessage }> {
  return apiFetch(`/api/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, replyToId, attachments }),
  })
}

// ── Canned Responses ─────────────────────────────────────────────

export async function fetchCannedResponses(): Promise<{ responses: CannedResponse[] }> {
  return apiFetch("/api/tickets/canned-responses")
}

export async function createCannedResponse(data: {
  title: string
  body: string
  global?: boolean
}): Promise<{ response: CannedResponse }> {
  return apiFetch("/api/tickets/canned-responses", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCannedResponse(
  id: string,
  data: { title?: string; body?: string }
): Promise<{ response: CannedResponse }> {
  return apiFetch(`/api/tickets/canned-responses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteCannedResponse(id: string): Promise<void> {
  await apiFetch(`/api/tickets/canned-responses/${id}`, { method: "DELETE" })
}

// ── Unread ───────────────────────────────────────────────────────

export async function fetchUnreadTickets(): Promise<{ counts: Record<string, number> }> {
  return apiFetch("/api/tickets/unread")
}

// ── Staff ────────────────────────────────────────────────────────

export async function fetchStaffBySector(sector: string): Promise<{ staff: { id: string; name: string; sector: string }[] }> {
  return apiFetch(`/api/tickets/staff?sector=${encodeURIComponent(sector)}`)
}
