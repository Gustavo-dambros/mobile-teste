"use client"

import { createBroadcastChannel } from "@/lib/realtime/broadcast-channel"

const MESSAGE_EVENT = "message"
const MESSAGE_UPDATED_EVENT = "message-updated"
const CONVERSATION_EVENT = "conversation-updated"
const TYPING_EVENT = "typing"
const CALL_EVENT = "call-updated"

const channel = createBroadcastChannel("chat-interno-activity")

// Payloads below are ids/metadata only, never message text, conversation name/
// description, or call details — a Supabase Realtime broadcast channel like this one
// is joinable by anyone holding the public anon key (i.e. anyone with the app open),
// with no per-conversation authorization. Broadcasting full objects used to hand every
// DM's text and every group's name/membership to every logged-in employee regardless
// of whether they belonged to that conversation. Recipients now re-fetch over the
// authenticated REST API instead of trusting broadcast content directly (same fix
// already applied to lib/reunioes/realtime.ts).

interface MessagePayload {
  conversationId: string
  messageId: string
  authorId: string
}

/** A brand-new message — recipients notify (sound/desktop) after confirming the
 * content via an authenticated fetch. */
export function broadcastChatMessage(payload: MessagePayload) {
  return channel.send(MESSAGE_EVENT, payload)
}

/** An existing message changed (edited, deleted, reacted to) — recipients refresh
 * silently, no notification. */
export function broadcastMessageUpdated(payload: MessagePayload) {
  return channel.send(MESSAGE_UPDATED_EVENT, payload)
}

export function broadcastConversationUpdated(conversationId: string) {
  return channel.send(CONVERSATION_EVENT, { conversationId })
}

export function broadcastTyping(conversationId: string, userId: string, userName: string) {
  return channel.send(TYPING_EVENT, { conversationId, userId, userName })
}

export function broadcastCallUpdated(callId: string) {
  return channel.send(CALL_EVENT, { callId })
}

interface TypingPayload {
  conversationId: string
  userId: string
  userName: string
}

/** App-wide chat activity — new/updated conversations, messages, calls and typing, for badges, list views and incoming-call rings. */
export function useChatActivity(
  onMessage: (payload: MessagePayload) => void,
  onMessageUpdated: (payload: MessagePayload) => void,
  onConversationUpdated: (conversationId: string) => void,
  onCallUpdated: (callId: string) => void,
  onTyping: (payload: TypingPayload) => void
) {
  channel.useSubscription({
    [MESSAGE_EVENT]: (payload) => onMessage(payload as MessagePayload),
    [MESSAGE_UPDATED_EVENT]: (payload) => onMessageUpdated(payload as MessagePayload),
    [CONVERSATION_EVENT]: (payload) => onConversationUpdated((payload as { conversationId: string }).conversationId),
    [CALL_EVENT]: (payload) => onCallUpdated((payload as { callId: string }).callId),
    [TYPING_EVENT]: (payload) => onTyping(payload as TypingPayload),
  })
}
