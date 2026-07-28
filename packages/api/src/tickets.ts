import type { Ticket, TicketMessage, CannedResponse } from "@unipar/types"
import { getSupabase } from "./supabase"

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

// ── Tickets ──────────────────────────────────────────────────────

export async function fetchTickets(): Promise<Ticket[]> {
  return apiFetch<Ticket[]>("/tickets")
}

export async function fetchTicket(id: string): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/${id}`)
}

export async function createTicket(data: {
  title: string
  description: string
  sector: string
  priority: string
}): Promise<Ticket> {
  return apiFetch<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function closeTicket(id: string, reason: string): Promise<void> {
  await apiFetch(`/tickets/${id}/close`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

export async function reopenTicket(id: string): Promise<void> {
  await apiFetch(`/tickets/${id}/reopen`, { method: "POST" })
}

// ── Ticket Messages ──────────────────────────────────────────────

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  return apiFetch<TicketMessage[]>(`/tickets/${ticketId}/messages`)
}

export async function sendTicketMessage(
  ticketId: string,
  text: string,
  replyToId?: string
): Promise<TicketMessage> {
  return apiFetch<TicketMessage>(`/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, replyToId }),
  })
}

// ── Canned Responses ─────────────────────────────────────────────

export async function fetchCannedResponses(): Promise<CannedResponse[]> {
  return apiFetch<CannedResponse[]>("/tickets/canned-responses")
}

// ── Unread ───────────────────────────────────────────────────────

export async function fetchUnreadTickets(): Promise<{ ticketId: string; unread: boolean }[]> {
  return apiFetch("/tickets/unread")
}
