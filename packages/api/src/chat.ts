import type { Conversation, ChatMessage, Call } from "@unipar/types"
import { apiFetch } from "./api-fetch"

// ── Conversations ────────────────────────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/api/chat-interno/conversations")
}

export async function createConversation(data: {
  kind: "dm" | "group"
  memberIds: string[]
  name?: string
}): Promise<Conversation> {
  return apiFetch<Conversation>("/api/chat-interno/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/chat-interno/conversations/${id}`)
}

export async function leaveConversation(id: string): Promise<void> {
  await apiFetch(`/api/chat-interno/conversations/${id}/leave`, { method: "POST" })
}

export async function addMember(
  conversationId: string,
  userId: string
): Promise<void> {
  await apiFetch(`/api/chat-interno/conversations/${conversationId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  })
}

export async function removeMember(
  conversationId: string,
  userId: string
): Promise<void> {
  await apiFetch(
    `/api/chat-interno/conversations/${conversationId}/members/${userId}/remove`,
    { method: "POST" }
  )
}

export async function toggleAdmin(
  conversationId: string,
  userId: string
): Promise<void> {
  await apiFetch(
    `/api/chat-interno/conversations/${conversationId}/members/${userId}/admin`,
    { method: "POST" }
  )
}

// ── Messages ─────────────────────────────────────────────────────

export async function fetchMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<{ messages: ChatMessage[] }> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set("before", before)
  return apiFetch(
    `/api/chat-interno/conversations/${conversationId}/messages?${params}`
  )
}

export async function sendMessage(
  conversationId: string,
  text: string,
  replyToId?: string
): Promise<{ message: ChatMessage }> {
  return apiFetch(`/api/chat-interno/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, replyToId }),
  })
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  text: string
): Promise<{ message: ChatMessage }> {
  return apiFetch(
    `/api/chat-interno/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ text }),
    }
  )
}

export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  await apiFetch(
    `/api/chat-interno/conversations/${conversationId}/messages/${messageId}/delete`,
    { method: "POST" }
  )
}

export async function reactToMessage(
  conversationId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  await apiFetch(
    `/api/chat-interno/conversations/${conversationId}/messages/${messageId}/react`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  )
}

// ── Pins ─────────────────────────────────────────────────────────

export async function pinMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  await apiFetch(
    `/api/chat-interno/conversations/${conversationId}/pins/${messageId}`,
    { method: "POST" }
  )
}

export async function unpinMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  await apiFetch(
    `/api/chat-interno/conversations/${conversationId}/pins/${messageId}`,
    { method: "DELETE" }
  )
}

// ── Calls ────────────────────────────────────────────────────────

export async function startCall(
  conversationId: string,
  kind: "audio" | "video"
): Promise<Call> {
  return apiFetch<Call>(
    `/api/chat-interno/conversations/${conversationId}/calls`,
    {
      method: "POST",
      body: JSON.stringify({ kind }),
    }
  )
}

export async function answerCall(callId: string): Promise<void> {
  await apiFetch(`/api/chat-interno/calls/${callId}/answer`, { method: "POST" })
}

export async function declineCall(callId: string): Promise<void> {
  await apiFetch(`/api/chat-interno/calls/${callId}/decline`, { method: "POST" })
}

export async function endCall(callId: string): Promise<void> {
  await apiFetch(`/api/chat-interno/calls/${callId}/end`, { method: "POST" })
}

export async function missCall(callId: string): Promise<void> {
  await apiFetch(`/api/chat-interno/calls/${callId}/miss`, { method: "POST" })
}

// ── Roster ───────────────────────────────────────────────────────

export async function fetchRoster(): Promise<{ members: unknown[] }> {
  return apiFetch("/api/chat-interno/roster")
}

// ── Unread ───────────────────────────────────────────────────────

export async function fetchUnreadCount(): Promise<{ count: number }> {
  return apiFetch("/api/chat-interno/unread")
}

// ── Seen ─────────────────────────────────────────────────────────

export async function markConversationSeen(conversationId: string): Promise<void> {
  await apiFetch(`/api/chat-interno/conversations/${conversationId}/seen`, {
    method: "POST",
  })
}
