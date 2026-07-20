"use client"

import { createBroadcastChannel } from "@/lib/realtime/broadcast-channel"

const MESSAGE_EVENT = "message"
const TICKET_EVENT = "ticket-updated"

const channel = createBroadcastChannel("tickets-activity")

// Payloads below are ids/metadata only, never the ticket or message itself — a
// Supabase Realtime broadcast channel like this one is joinable by anyone holding the
// public anon key, with no per-ticket authorization. Broadcasting full objects used to
// hand every support ticket's message text, attachment URLs, requester/assignee names
// and close/delete reasons to every logged-in employee regardless of sector or
// ownership. Recipients now re-fetch over the authenticated REST API (which does
// enforce canAccessTicket) instead of trusting broadcast content directly (same fix
// already applied to lib/reunioes/realtime.ts).

interface MessagePayload {
  ticketId: string
  messageId: string
  authorId: string
}

export function broadcastTicketMessage(payload: MessagePayload) {
  return channel.send(MESSAGE_EVENT, payload)
}

export function broadcastTicketUpdated(ticketId: string) {
  return channel.send(TICKET_EVENT, { ticketId })
}

/**
 * App-wide ticket activity feed — new/updated tickets and new messages
 * across every ticket, for badges and list views (mounted once in
 * TicketsProvider). Broadcast gives near-instant updates; callers should
 * still poll the source of truth on an interval as a reliability backstop,
 * since some networks silently block the WebSocket upgrade.
 */
export function useTicketsActivity(
  onMessage: (payload: MessagePayload) => void,
  onTicketUpdated: (ticketId: string) => void
) {
  channel.useSubscription({
    [MESSAGE_EVENT]: (payload) => onMessage(payload as MessagePayload),
    [TICKET_EVENT]: (payload) => onTicketUpdated((payload as { ticketId: string }).ticketId),
  })
}

/** Per-chat realtime — signals that a specific ticket has a new message while its
 * chat is open, so the caller can re-fetch. No longer receives message content
 * client-side-filtered from the global feed — every listener used to get every
 * ticket's message body over the wire regardless of the ticketId filter below. */
export function useTicketRealtime(ticketId: string, onChanged: () => void) {
  channel.useSubscription({
    [MESSAGE_EVENT]: (payload) => {
      const p = payload as MessagePayload
      if (p.ticketId === ticketId) onChanged()
    },
  })

  return { connected: true }
}
