import "server-only"

import type { MessageStatus, TicketAttachment } from "@/components/tickets/types"
import type { SessionUser } from "@/lib/session"
import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

export class TicketAuthError extends Error {
  constructor(message = "Não autenticado") {
    super(message)
    this.name = "TicketAuthError"
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new TicketAuthError()
  return user
}

export function ticketNumber(n: number) {
  return `CH-${String(n).padStart(4, "0")}`
}

// Supabase's untyped query builder (no generated Database types) infers
// to-one embedded relations as arrays since it can't see the FK's
// uniqueness — at runtime PostgREST still returns a single object. Normalize
// either shape here instead of casting at every call site.
type Embed<T> = T | T[] | null
function one<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const TICKET_SELECT = `
  id, number, title, description, status, priority, sector,
  requester_id, assignee_id, closed_by_id, close_reason,
  deleted, delete_reason, attachments, created_at, updated_at,
  first_response_at, satisfaction_rating, satisfaction_comment,
  requester:profiles!tickets_requester_id_fkey(name),
  assignee:profiles!tickets_assignee_id_fkey(name),
  closed_by:profiles!tickets_closed_by_id_fkey(name)
`

interface TicketRow {
  id: string
  number: number
  title: string
  description: string
  status: string
  priority: string
  sector: string
  requester_id: string
  assignee_id: string | null
  closed_by_id: string | null
  close_reason: string | null
  deleted: boolean
  delete_reason: string | null
  attachments: TicketAttachment[] | null
  created_at: string
  updated_at: string
  first_response_at: string | null
  satisfaction_rating: number | null
  satisfaction_comment: string | null
  requester: Embed<{ name: string }>
  assignee: Embed<{ name: string }>
  closed_by: Embed<{ name: string }>
}

export function mapTicketRow(row: TicketRow) {
  const requester = one(row.requester)
  const assignee = one(row.assignee)
  const closedBy = one(row.closed_by)
  return {
    id: row.id,
    number: ticketNumber(row.number),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    sector: row.sector,
    requesterId: row.requester_id,
    requesterName: requester?.name ?? "",
    assigneeId: row.assignee_id,
    assignee: assignee?.name ?? "",
    closedById: row.closed_by_id ?? undefined,
    closedByName: closedBy?.name ?? undefined,
    closeReason: row.close_reason ?? undefined,
    deleted: row.deleted,
    deleteReason: row.delete_reason ?? undefined,
    attachments: row.attachments ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    firstResponseAt: row.first_response_at ?? undefined,
    satisfactionRating: row.satisfaction_rating ?? undefined,
    satisfactionComment: row.satisfaction_comment ?? undefined,
  }
}

interface MessageRow {
  id: string
  ticket_id: string
  kind: string
  author_id: string | null
  text: string
  created_at: string
  edited_at: string | null
  deleted_for_everyone: boolean
  reply_to_id: string | null
  system_event: string | null
  attachments: TicketAttachment[] | null
  author: Embed<{ name: string }>
}

export const MESSAGE_SELECT = `
  id, ticket_id, kind, author_id, text, created_at, edited_at,
  deleted_for_everyone, reply_to_id, system_event, attachments,
  author:profiles!ticket_messages_author_id_fkey(name)
`

export function mapMessageRow(row: MessageRow, currentUserId: string) {
  const author = one(row.author)
  return {
    id: row.id,
    ticketId: row.ticket_id,
    kind: row.kind,
    authorId: row.author_id ?? "",
    authorName: author?.name ?? "Sistema",
    isOwn: row.author_id === currentUserId,
    text: row.deleted_for_everyone ? "" : row.text,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? undefined,
    deletedForEveryone: row.deleted_for_everyone,
    status: "sent" as MessageStatus,
    attachments: row.deleted_for_everyone ? [] : (row.attachments ?? []),
    replyToId: row.reply_to_id ?? undefined,
    systemEvent: row.system_event ?? undefined,
  }
}

/**
 * Real per-message read receipts, derived from ticket_read_state: a message
 * I sent shows "seen" once someone other than me has viewed the ticket at or
 * after that message's timestamp. There's no per-device delivery ack to
 * distinguish "delivered" from "sent", so that middle state is never
 * emitted — only "sent" and "seen".
 */
export function applySeenStatus<T extends { authorId: string; kind: string; createdAt: string; status?: MessageStatus }>(
  messages: T[],
  readStates: { user_id: string; last_seen_at: string }[],
  currentUserId: string
): T[] {
  const othersLastSeenAt = readStates
    .filter((r) => r.user_id !== currentUserId)
    .reduce((max, r) => (r.last_seen_at > max ? r.last_seen_at : max), "")

  if (!othersLastSeenAt) return messages

  return messages.map((m) =>
    m.kind === "message" && m.authorId === currentUserId && m.createdAt <= othersLastSeenAt
      ? { ...m, status: "seen" as MessageStatus }
      : m
  )
}

export const CANNED_SELECT = `
  id, title, body, sector, created_by_id, created_at, updated_at,
  created_by:profiles!ticket_canned_responses_created_by_id_fkey(name)
`

interface CannedResponseRow {
  id: string
  title: string
  body: string
  sector: string | null
  created_by_id: string
  created_at: string
  updated_at: string
  created_by: Embed<{ name: string }>
}

export function mapCannedResponseRow(row: CannedResponseRow) {
  const createdBy = one(row.created_by)
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    sector: row.sector ?? undefined,
    createdById: row.created_by_id,
    createdByName: createdBy?.name ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function canAccessTicket(user: SessionUser, ticketId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("tickets")
    .select("requester_id, sector, deleted")
    .eq("id", ticketId)
    .single()
  if (!data || data.deleted) return false
  return data.requester_id === user.id || data.sector === user.sector || user.role === "ADMIN"
}
