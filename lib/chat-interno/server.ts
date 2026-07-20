import "server-only"

import type { ChatAttachment } from "@/lib/chat-interno/types"
import type { SessionUser } from "@/lib/session"
import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"

export class ChatAuthError extends Error {
  constructor(message = "Não autenticado") {
    super(message)
    this.name = "ChatAuthError"
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new ChatAuthError()
  return user
}

export async function canAccessConversation(userId: string, conversationId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle()
  return !!data
}

export async function isActiveMember(userId: string, conversationId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle()
  return !!data
}

interface MemberRow {
  user_id: string
  is_admin: boolean
  left_at: string | null
  profiles: { name: string } | { name: string }[] | null
}

function oneOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Fetches every member row (including departed ones) for a conversation, with profile names joined. */
export async function getConversationMembers(conversationId: string): Promise<MemberRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("conversation_members")
    .select("user_id, is_admin, left_at, profiles(name)")
    .eq("conversation_id", conversationId)
  return data ?? []
}

export interface ConversationDTO {
  id: string
  kind: "dm" | "group"
  memberIds: string[]
  name?: string
  description?: string
  adminIds: string[]
  createdBy: string
  createdAt: string
  leftAt?: string
}

/** Maps a conversation row + its member rows into the client shape, self-excluded from memberIds (mirrors legacy shape). */
export function mapConversation(
  row: { id: string; kind: string; name: string | null; description: string | null; created_by: string; created_at: string },
  members: MemberRow[],
  currentUserId: string
): ConversationDTO {
  const self = members.find((m) => m.user_id === currentUserId)
  // getConversationMembers deliberately returns departed rows too (needed for
  // `self`/leftAt above), but the group's visible roster shouldn't keep
  // listing people who left/were removed as still-active members or admins.
  const activeMembers = members.filter((m) => !m.left_at)
  return {
    id: row.id,
    kind: row.kind as "dm" | "group",
    memberIds: activeMembers.filter((m) => m.user_id !== currentUserId).map((m) => m.user_id),
    name: row.name ?? undefined,
    description: row.description ?? undefined,
    adminIds: activeMembers.filter((m) => m.is_admin).map((m) => m.user_id),
    createdBy: row.created_by,
    createdAt: row.created_at,
    leftAt: self?.left_at ?? undefined,
  }
}

export const MESSAGE_SELECT = `
  id, conversation_id, kind, author_id, text, created_at, edited_at,
  deleted_for_everyone, reply_to_id, attachments, reactions, system_event, system_meta,
  author:profiles!chat_messages_author_id_fkey(name)
`

interface MessageRow {
  id: string
  conversation_id: string
  kind: string
  author_id: string | null
  text: string
  created_at: string
  edited_at: string | null
  deleted_for_everyone: boolean
  reply_to_id: string | null
  attachments: ChatAttachment[] | null
  reactions: Record<string, string[]> | null
  system_event: string | null
  system_meta: Record<string, unknown> | null
  author: { name: string } | { name: string }[] | null
}

export function mapMessageRow(row: MessageRow, currentUserId: string) {
  const author = oneOf(row.author)
  return {
    id: row.id,
    conversationId: row.conversation_id,
    kind: row.kind,
    authorId: row.author_id ?? "",
    authorName: author?.name ?? "Sistema",
    isOwn: row.author_id === currentUserId,
    text: row.deleted_for_everyone ? "" : row.text,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? undefined,
    deletedForEveryone: row.deleted_for_everyone,
    status: "sent" as const,
    attachments: row.deleted_for_everyone ? [] : (row.attachments ?? []),
    replyToId: row.reply_to_id ?? undefined,
    reactions: row.reactions ?? {},
    systemEvent: row.system_event ?? undefined,
    systemMeta: row.system_meta ?? undefined,
  }
}

export const PINNED_SELECT = `
  message_id, pinned_by_id, pinned_at,
  pinned_by:profiles!chat_pinned_messages_pinned_by_id_fkey(name),
  message:chat_messages!chat_pinned_messages_message_id_fkey(${MESSAGE_SELECT})
`

interface PinnedRow {
  message_id: string
  pinned_by_id: string
  pinned_at: string
  pinned_by: { name: string } | { name: string }[] | null
  message: MessageRow | MessageRow[] | null
}

export function mapPinnedRow(row: PinnedRow, currentUserId: string) {
  const pinnedBy = oneOf(row.pinned_by)
  const message = oneOf(row.message)
  return {
    messageId: row.message_id,
    pinnedById: row.pinned_by_id,
    pinnedByName: pinnedBy?.name ?? "Alguém",
    pinnedAt: row.pinned_at,
    message: message ? mapMessageRow(message, currentUserId) : undefined,
  }
}

export interface CallRow {
  id: string
  conversation_id: string
  kind: string
  caller_id: string
  status: string
  room_name: string
  started_at: string
  answered_at: string | null
  ended_at: string | null
}

export interface CallParticipantRow {
  id: string
  call_id: string
  user_id: string
  status: string
  joined_at: string | null
  ended_at: string | null
}

export function mapCallParticipantRow(row: CallParticipantRow) {
  return {
    id: row.id,
    callId: row.call_id,
    userId: row.user_id,
    status: row.status,
    joinedAt: row.joined_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
  }
}

export function mapCallRow(row: CallRow, participants: CallParticipantRow[] = []) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    kind: row.kind,
    callerId: row.caller_id,
    status: row.status,
    roomName: row.room_name,
    startedAt: row.started_at,
    answeredAt: row.answered_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    participants: participants.map(mapCallParticipantRow),
  }
}

/** Every `call_participants` row for a call, unmapped (caller included). */
export async function getCallParticipantRows(admin: ReturnType<typeof createAdminClient>, callId: string) {
  const { data } = await admin.from("call_participants").select("*").eq("call_id", callId)
  return data ?? []
}

/**
 * A group call's shared `calls.status` only leaves "ringing" once someone
 * answers OR everyone invited has declined/missed — otherwise a single
 * decline/timeout would incorrectly resolve the caller's outgoing dialog
 * while other invitees are still being rung. Call after updating one
 * participant row to "declined"/"missed"; no-ops if the call already went
 * active (someone else answered) or others are still ringing.
 */
export async function resolveCallIfNoneRinging(
  admin: ReturnType<typeof createAdminClient>,
  callId: string,
  outcome: "declined" | "missed"
) {
  const { data: call } = await admin.from("calls").select("status").eq("id", callId).single()
  if (call?.status !== "ringing") return
  const { count } = await admin
    .from("call_participants")
    .select("id", { count: "exact", head: true })
    .eq("call_id", callId)
    .eq("status", "ringing")
  if ((count ?? 0) > 0) return
  await admin
    .from("calls")
    .update({ status: outcome, ended_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("status", "ringing")
}

export function applySeenStatus<T extends { authorId: string; kind: string; createdAt: string; status?: string }>(
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
      ? { ...m, status: "seen" }
      : m
  )
}
