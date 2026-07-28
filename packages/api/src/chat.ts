import type { Conversation, ChatMessage, Call } from "@unipar/types"

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

// ── Conversations ────────────────────────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/chat-interno/conversations")
}

export async function createConversation(data: {
  kind: "dm" | "group"
  memberIds: string[]
  name?: string
}): Promise<Conversation> {
  return apiFetch<Conversation>("/chat-interno/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ── Messages ─────────────────────────────────────────────────────

export async function fetchMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set("before", before)
  return apiFetch<ChatMessage[]>(
    `/chat-interno/conversations/${conversationId}/messages?${params}`
  )
}

export async function sendMessage(
  conversationId: string,
  text: string,
  replyToId?: string
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(
    `/chat-interno/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ text, replyToId }),
    }
  )
}

// ── Calls ────────────────────────────────────────────────────────

export async function startCall(
  conversationId: string,
  kind: "audio" | "video"
): Promise<Call> {
  return apiFetch<Call>(`/chat-interno/conversations/${conversationId}/calls`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  })
}

export async function answerCall(callId: string): Promise<void> {
  await apiFetch(`/chat-interno/calls/${callId}/answer`, { method: "POST" })
}

export async function declineCall(callId: string): Promise<void> {
  await apiFetch(`/chat-interno/calls/${callId}/decline`, { method: "POST" })
}

export async function endCall(callId: string): Promise<void> {
  await apiFetch(`/chat-interno/calls/${callId}/end`, { method: "POST" })
}

// ── Unread ───────────────────────────────────────────────────────

export async function fetchUnreadCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>("/chat-interno/unread")
  return data.count
}
