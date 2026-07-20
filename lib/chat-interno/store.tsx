"use client"

import * as React from "react"
import { toast } from "sonner"

import { useCurrentUser } from "@/lib/current-user/context"
import { playChatNotificationSound } from "@/lib/chat-interno/notification-sound"
import { notifyBrowser } from "@/lib/notifications/browser-notifications"
import {
  broadcastCallUpdated,
  broadcastChatMessage,
  broadcastConversationUpdated,
  broadcastMessageUpdated,
  broadcastTyping,
  useChatActivity,
} from "@/lib/chat-interno/realtime"
import { uploadAttachments } from "@/lib/chat-interno/upload"
import type { Call, ChatAttachment, ChatMessage, Conversation, PinnedMessage, TypingEntry } from "@/lib/chat-interno/types"

export interface ActionResult {
  ok: boolean
  error?: string
}

const POLL_INTERVAL_MS = 8_000
const CALL_POLL_INTERVAL_MS = 3_000
const TYPING_TTL_MS = 3000
const HIDDEN_FOR_ME_KEY = "chat-interno:hidden-for-me"

function loadHiddenForMe(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(HIDDEN_FOR_ME_KEY)
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveHiddenForMe(ids: Set<string>) {
  try {
    window.localStorage.setItem(HIDDEN_FOR_ME_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore — purely a cosmetic per-browser preference
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
  return data as T
}

interface ChatInternoContextValue {
  conversations: Conversation[]
  calls: Call[]
  typing: TypingEntry[]

  getConversation: (id: string) => Conversation | undefined
  getMessagesFor: (conversationId: string) => ChatMessage[]
  loadMessages: (conversationId: string) => Promise<void>
  getMessage: (conversationId: string, id: string) => ChatMessage | undefined
  isPinned: (conversationId: string, messageId: string) => boolean
  getPinnedCount: (conversationId: string) => number
  getPinnedMessagesFor: (conversationId: string) => PinnedMessage[]
  loadPinnedMessages: (conversationId: string) => Promise<void>
  pinMessage: (conversationId: string, messageId: string) => Promise<void>
  unpinMessage: (conversationId: string, messageId: string) => Promise<void>
  getCall: (id: string) => Call | undefined
  refreshCall: (callId: string) => Promise<void>
  getUnreadCount: (conversationId: string) => number
  hasUnread: (conversationId: string) => boolean
  setActiveConversationId: (id: string | null) => void

  createDmConversation: (memberId: string) => Promise<ActionResult & { conversation?: Conversation }>
  createGroup: (input: {
    name: string
    description?: string
    memberIds: string[]
  }) => Promise<ActionResult & { conversation?: Conversation }>
  renameGroup: (conversationId: string, name: string) => Promise<ActionResult>
  updateGroupDescription: (conversationId: string, description: string) => Promise<ActionResult>
  addGroupMembers: (conversationId: string, memberIds: string[]) => Promise<ActionResult>
  removeGroupMember: (conversationId: string, memberId: string) => Promise<ActionResult>
  leaveGroup: (conversationId: string) => Promise<ActionResult>
  toggleGroupAdmin: (conversationId: string, memberId: string) => Promise<ActionResult>

  sendMessage: (
    conversationId: string,
    input: { text: string; attachments?: ChatAttachment[]; replyToId?: string }
  ) => Promise<ActionResult & { message?: ChatMessage }>
  editMessage: (conversationId: string, id: string, text: string) => Promise<ActionResult>
  deleteMessageForMe: (id: string) => ActionResult
  deleteMessageForEveryone: (conversationId: string, id: string) => Promise<ActionResult>
  toggleReaction: (conversationId: string, id: string, emoji: string) => Promise<void>

  setTyping: (conversationId: string) => void
  markConversationSeen: (conversationId: string) => void

  startCall: (conversationId: string, kind: "audio" | "video") => Promise<ActionResult & { call?: Call }>
  answerCall: (callId: string) => Promise<ActionResult>
  declineCall: (callId: string) => Promise<ActionResult>
  missCall: (callId: string) => Promise<ActionResult>
  endCall: (callId: string) => Promise<ActionResult>
}

const ChatInternoContext = React.createContext<ChatInternoContextValue | null>(null)

export function ChatInternoProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser()
  const currentUserRef = React.useRef(currentUser)
  React.useLayoutEffect(() => {
    currentUserRef.current = currentUser
  })

  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [messagesByConversation, setMessagesByConversation] = React.useState<Record<string, ChatMessage[]>>({})
  const [pinnedIdsByConversation, setPinnedIdsByConversation] = React.useState<Record<string, string[]>>({})
  const [pinnedListByConversation, setPinnedListByConversation] = React.useState<Record<string, PinnedMessage[]>>({})
  const [unreadCounts, setUnreadCounts] = React.useState<Record<string, number>>({})
  const [calls, setCalls] = React.useState<Call[]>([])
  const [typing, setTypingState] = React.useState<TypingEntry[]>([])
  const [hiddenForMe, setHiddenForMe] = React.useState<Set<string>>(() => loadHiddenForMe())

  const knownConversationIdsRef = React.useRef<Set<string> | null>(null)
  const prevUnreadRef = React.useRef<Record<string, number> | null>(null)

  // Tracks which conversation the user currently has open (set by
  // ChatInternoShell) so incoming-message sounds/notifications can be
  // skipped for a conversation the user is already looking at, and so the
  // broadcast handler and the unread poll below don't both play a sound for
  // the same message (see suppressUnreadSoundRef).
  const activeConversationIdRef = React.useRef<string | null>(null)
  const setActiveConversationId = React.useCallback((id: string | null) => {
    activeConversationIdRef.current = id
  }, [])
  function shouldPlaySoundFor(conversationId: string) {
    if (
      activeConversationIdRef.current === conversationId &&
      document.visibilityState === "visible" &&
      document.hasFocus()
    ) {
      return false
    }
    return true
  }
  const suppressUnreadSoundRef = React.useRef<Set<string>>(new Set())

  const refreshConversations = React.useCallback(async () => {
    try {
      const data = await api<{ conversations: Conversation[] }>("/api/chat-interno/conversations")
      const user = currentUserRef.current
      if (knownConversationIdsRef.current) {
        for (const c of data.conversations) {
          if (!knownConversationIdsRef.current.has(c.id) && c.createdBy !== user?.id) {
            playChatNotificationSound()
            notifyBrowser("Nova conversa", c.kind === "group" ? c.name ?? "Você foi adicionado a um grupo" : "Você tem uma nova conversa", { tag: `chat-conversation-${c.id}` })
          }
        }
      }
      knownConversationIdsRef.current = new Set(data.conversations.map((c) => c.id))
      setConversations(data.conversations)
    } catch {
      // silent — poll/broadcast will retry
    }
  }, [])

  const refreshUnread = React.useCallback(async () => {
    try {
      const data = await api<{ counts: Record<string, number> }>("/api/chat-interno/unread")
      if (prevUnreadRef.current) {
        for (const [id, count] of Object.entries(data.counts)) {
          if (count > (prevUnreadRef.current[id] ?? 0)) {
            // Skip if the broadcast handler already played a sound for this
            // conversation's incoming message (see suppressUnreadSoundRef),
            // or if the user currently has it open and focused.
            if (!suppressUnreadSoundRef.current.has(id) && shouldPlaySoundFor(id)) {
              playChatNotificationSound()
              notifyBrowser("Novas mensagens", "Você tem mensagens não lidas no chat.", { tag: `chat-conversation-${id}` })
              break
            }
          }
        }
      }
      prevUnreadRef.current = data.counts
      setUnreadCounts(data.counts)
    } catch {
      // silent
    }
  }, [])

  React.useEffect(() => {
    function poll() {
      refreshConversations()
      refreshUnread()
    }
    const initial = window.setTimeout(poll, 0)
    const interval = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [refreshConversations, refreshUnread])

  // Expire stale typing entries every second.
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const nowMs = Date.now()
      setTypingState((prev) => {
        const next = prev.filter((t) => t.expiresAt > nowMs)
        return next.length === prev.length ? prev : next
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const mergeMessage = React.useCallback((conversationId: string, message: ChatMessage) => {
    setMessagesByConversation((prev) => {
      // Merge even if this conversation's list hasn't loaded yet (e.g. a
      // send racing the initial fetch) — dropping the message here would
      // silently hide it until the next full reload. The eventual
      // loadMessages() call still overwrites this with the authoritative
      // server list once it resolves.
      const existing = prev[conversationId] ?? []
      const withoutDup = existing.filter((m) => m.id !== message.id)
      return {
        ...prev,
        [conversationId]: [...withoutDup, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }
    })
  }, [])

  const applyConversationUpdate = React.useCallback((conversation: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversation.id)
      return exists ? prev.map((c) => (c.id === conversation.id ? conversation : c)) : [conversation, ...prev]
    })
  }, [])

  const applyCallUpdate = React.useCallback((call: Call) => {
    setCalls((prev) => {
      const exists = prev.some((c) => c.id === call.id)
      return exists ? prev.map((c) => (c.id === call.id ? call : c)) : [call, ...prev]
    })
  }, [])

  // Kept in sync with `calls` so the poll loop below can read the latest
  // ringing ids without depending on `calls` itself (that would tear down
  // and restart the interval on every single call update).
  const callsRef = React.useRef<Call[]>(calls)
  React.useEffect(() => {
    callsRef.current = calls
  }, [calls])

  // Realtime broadcast is the only thing that ever pushes a call's
  // ringing/active state — there was no polling fallback for it at all, so
  // a receiver whose WebSocket connection is silently broken (confirmed to
  // happen in this environment) never saw the incoming-call dialog and the
  // call always timed out to "missed". Poll every few seconds as a backstop,
  // same reliability pattern as tickets/messages.
  //
  // Also send the ids of calls we currently show as ringing: the server
  // filters to ringing/active by default, so once a call the receiver is
  // still displaying flips to a terminal status (missed/declined/ended)
  // it would otherwise vanish from the response and the receiver's dialog
  // would ring forever instead of dropping too.
  React.useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const knownIds = callsRef.current.filter((c) => c.status === "ringing").map((c) => c.id)
        const query = knownIds.length > 0 ? `?knownIds=${knownIds.join(",")}` : ""
        const data = await api<{ calls: Call[] }>(`/api/chat-interno/calls/ringing${query}`)
        if (cancelled) return
        for (const call of data.calls) applyCallUpdate(call)
      } catch {
        // silent — next tick retries
      }
    }
    const initial = window.setTimeout(poll, 0)
    const interval = window.setInterval(poll, CALL_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [applyCallUpdate])

  // On-demand refresh for a specific call — used while a call room is open,
  // as a broadcast-failure backstop so "the other side hung up" is never
  // missed (the general ringing/active poll above only tracks calls that
  // are still ringing or active across ALL conversations, which is enough
  // to *discover* calls but callers already inside a room poll this
  // directly for lower latency on the one call they actually care about).
  const refreshCall = React.useCallback(
    async (callId: string) => {
      try {
        const data = await api<{ call: Call }>(`/api/chat-interno/calls/${callId}`)
        applyCallUpdate(data.call)
      } catch {
        // silent — next tick retries
      }
    },
    [applyCallUpdate]
  )

  // The broadcast is just an id/metadata pointer now (see lib/chat-interno/realtime.ts
  // for why) — refresh the conversation's messages from the authenticated REST API
  // rather than trusting broadcast content. Runs regardless of whether this
  // conversation is currently open, same as the old mergeMessage did, since that's
  // what lets a conversation the user hasn't opened yet still trigger a notification.
  const refetchConversationMessages = React.useCallback(async (conversationId: string) => {
    try {
      const data = await api<{ messages: ChatMessage[]; pinnedMessageIds: string[] }>(
        `/api/chat-interno/conversations/${conversationId}/messages`
      )
      setMessagesByConversation((prev) => ({ ...prev, [conversationId]: data.messages }))
      setPinnedIdsByConversation((prev) => ({ ...prev, [conversationId]: data.pinnedMessageIds }))
      return data.messages
    } catch {
      // Not a member (404) or transient failure — either way, nothing to apply.
      return null
    }
  }, [])

  const loadPinnedMessages = React.useCallback(async (conversationId: string) => {
    try {
      const data = await api<{ pins: PinnedMessage[] }>(`/api/chat-interno/conversations/${conversationId}/pins`)
      setPinnedListByConversation((prev) => ({ ...prev, [conversationId]: data.pins }))
      setPinnedIdsByConversation((prev) => ({ ...prev, [conversationId]: data.pins.map((p) => p.messageId) }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as mensagens fixadas")
    }
  }, [])

  useChatActivity(
    React.useCallback(
      async (payload: { conversationId: string; messageId: string; authorId: string }) => {
        const messages = await refetchConversationMessages(payload.conversationId)
        if (!messages || payload.authorId === currentUserRef.current?.id) return
        const playSound = shouldPlaySoundFor(payload.conversationId)
        if (playSound) {
          // refreshUnread() below runs its own independent count-diff check
          // that would otherwise also play a sound for this same message —
          // register a short-lived suppression so it doesn't double-fire.
          suppressUnreadSoundRef.current.add(payload.conversationId)
          window.setTimeout(() => suppressUnreadSoundRef.current.delete(payload.conversationId), 5000)
        }
        refreshUnread()
        const message = messages.find((m) => m.id === payload.messageId)
        if (message && playSound) {
          playChatNotificationSound()
          if (message.kind !== "system") {
            notifyBrowser(message.authorName, message.text || "Novo anexo", {
              tag: `chat-conversation-${payload.conversationId}`,
            })
          }
        }
      },
      [refetchConversationMessages, refreshUnread]
    ),
    React.useCallback(
      (payload: { conversationId: string }) => {
        void refetchConversationMessages(payload.conversationId)
        void loadPinnedMessages(payload.conversationId)
      },
      [refetchConversationMessages, loadPinnedMessages]
    ),
    React.useCallback(() => refreshConversations(), [refreshConversations]),
    React.useCallback((callId: string) => refreshCall(callId), [refreshCall]),
    React.useCallback(
      (payload: { conversationId: string; userId: string; userName: string }) => {
        if (payload.userId === currentUserRef.current?.id) return
        setTypingState((prev) => {
          const withoutStale = prev.filter(
            (t) =>
              t.expiresAt > Date.now() &&
              !(t.conversationId === payload.conversationId && t.userId === payload.userId)
          )
          return [
            ...withoutStale,
            {
              conversationId: payload.conversationId,
              userId: payload.userId,
              userName: payload.userName,
              expiresAt: Date.now() + TYPING_TTL_MS,
            },
          ]
        })
      },
      []
    )
  )

  const getConversation = React.useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  )

  const getMessagesFor = React.useCallback(
    (conversationId: string) => {
      const list = messagesByConversation[conversationId] ?? []
      return list
        .map((m) => ({ ...m, deletedForMe: hiddenForMe.has(m.id) }))
        .filter((m) => !m.deletedForMe)
    },
    [messagesByConversation, hiddenForMe]
  )

  const loadMessages = React.useCallback(async (conversationId: string) => {
    try {
      const data = await api<{ messages: ChatMessage[]; pinnedMessageIds: string[] }>(
        `/api/chat-interno/conversations/${conversationId}/messages`
      )
      setMessagesByConversation((prev) => ({ ...prev, [conversationId]: data.messages }))
      setPinnedIdsByConversation((prev) => ({ ...prev, [conversationId]: data.pinnedMessageIds }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as mensagens")
    }
  }, [])

  const getMessage = React.useCallback(
    (conversationId: string, id: string) => messagesByConversation[conversationId]?.find((m) => m.id === id),
    [messagesByConversation]
  )

  const isPinned = React.useCallback(
    (conversationId: string, messageId: string) =>
      (pinnedIdsByConversation[conversationId] ?? []).includes(messageId),
    [pinnedIdsByConversation]
  )

  const getPinnedCount = React.useCallback(
    (conversationId: string) => (pinnedIdsByConversation[conversationId] ?? []).length,
    [pinnedIdsByConversation]
  )

  const getPinnedMessagesFor = React.useCallback(
    (conversationId: string) => pinnedListByConversation[conversationId] ?? [],
    [pinnedListByConversation]
  )

  const pinMessage = React.useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        const data = await api<{ pins: PinnedMessage[] }>(
          `/api/chat-interno/conversations/${conversationId}/pins`,
          { method: "POST", body: JSON.stringify({ messageId }) }
        )
        setPinnedListByConversation((prev) => ({ ...prev, [conversationId]: data.pins }))
        setPinnedIdsByConversation((prev) => ({ ...prev, [conversationId]: data.pins.map((p) => p.messageId) }))
        void broadcastConversationUpdated(conversationId)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível fixar a mensagem")
      }
    },
    []
  )

  const unpinMessage = React.useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        await api(`/api/chat-interno/conversations/${conversationId}/pins/${messageId}`, { method: "DELETE" })
        setPinnedListByConversation((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).filter((p) => p.messageId !== messageId),
        }))
        setPinnedIdsByConversation((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).filter((id) => id !== messageId),
        }))
        void broadcastConversationUpdated(conversationId)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível desafixar a mensagem")
      }
    },
    []
  )

  const getCall = React.useCallback((id: string) => calls.find((c) => c.id === id), [calls])

  const getUnreadCount = React.useCallback(
    (conversationId: string) => unreadCounts[conversationId] ?? 0,
    [unreadCounts]
  )
  const hasUnread = React.useCallback((conversationId: string) => getUnreadCount(conversationId) > 0, [getUnreadCount])

  // -------------------------------------------------------------------
  // Conversations / groups
  // -------------------------------------------------------------------

  const createDmConversation = React.useCallback(
    async (memberId: string): Promise<ActionResult & { conversation?: Conversation }> => {
      try {
        const data = await api<{ conversation: Conversation }>("/api/chat-interno/conversations", {
          method: "POST",
          body: JSON.stringify({ kind: "dm", memberId }),
        })
        applyConversationUpdate(data.conversation)
        void broadcastConversationUpdated(data.conversation.id)
        return { ok: true, conversation: data.conversation }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível iniciar a conversa"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyConversationUpdate]
  )

  const createGroup = React.useCallback(
    async (input: {
      name: string
      description?: string
      memberIds: string[]
    }): Promise<ActionResult & { conversation?: Conversation }> => {
      try {
        const data = await api<{ conversation: Conversation }>("/api/chat-interno/conversations", {
          method: "POST",
          body: JSON.stringify({ kind: "group", ...input }),
        })
        applyConversationUpdate(data.conversation)
        void broadcastConversationUpdated(data.conversation.id)
        return { ok: true, conversation: data.conversation }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível criar o grupo"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyConversationUpdate]
  )

  const renameGroup = React.useCallback(
    async (conversationId: string, name: string): Promise<ActionResult> => {
      try {
        const data = await api<{ conversation: Conversation }>(`/api/chat-interno/conversations/${conversationId}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        })
        applyConversationUpdate(data.conversation)
        void broadcastConversationUpdated(data.conversation.id)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível renomear o grupo"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyConversationUpdate]
  )

  const updateGroupDescription = React.useCallback(
    async (conversationId: string, description: string): Promise<ActionResult> => {
      try {
        const data = await api<{ conversation: Conversation }>(`/api/chat-interno/conversations/${conversationId}`, {
          method: "PATCH",
          body: JSON.stringify({ description }),
        })
        applyConversationUpdate(data.conversation)
        void broadcastConversationUpdated(data.conversation.id)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível editar a descrição"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyConversationUpdate]
  )

  const addGroupMembers = React.useCallback(
    async (conversationId: string, memberIds: string[]): Promise<ActionResult> => {
      try {
        await api(`/api/chat-interno/conversations/${conversationId}/members`, {
          method: "POST",
          body: JSON.stringify({ memberIds }),
        })
        await refreshConversations()
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível adicionar membros"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [refreshConversations]
  )

  const removeGroupMember = React.useCallback(
    async (conversationId: string, memberId: string): Promise<ActionResult> => {
      try {
        await api(`/api/chat-interno/conversations/${conversationId}/members/${memberId}/remove`, {
          method: "POST",
        })
        await refreshConversations()
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível remover o membro"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [refreshConversations]
  )

  const leaveGroup = React.useCallback(
    async (conversationId: string): Promise<ActionResult> => {
      try {
        await api(`/api/chat-interno/conversations/${conversationId}/leave`, { method: "POST" })
        await refreshConversations()
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível sair do grupo"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [refreshConversations]
  )

  const toggleGroupAdmin = React.useCallback(
    async (conversationId: string, memberId: string): Promise<ActionResult> => {
      try {
        await api(`/api/chat-interno/conversations/${conversationId}/members/${memberId}/admin`, {
          method: "POST",
        })
        await refreshConversations()
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível alterar o administrador"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [refreshConversations]
  )

  // -------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------

  const sendMessage = React.useCallback(
    async (
      conversationId: string,
      input: { text: string; attachments?: ChatAttachment[]; replyToId?: string }
    ): Promise<ActionResult & { message?: ChatMessage }> => {
      const text = input.text.trim()
      const attachments = input.attachments ?? []
      if (!text && attachments.length === 0) {
        return { ok: false, error: "Escreva uma mensagem ou anexe algo" }
      }
      try {
        const uploaded = await uploadAttachments(attachments)
        const data = await api<{ message: ChatMessage }>(
          `/api/chat-interno/conversations/${conversationId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ text, replyToId: input.replyToId, attachments: uploaded }),
          }
        )
        mergeMessage(conversationId, data.message)
        void broadcastChatMessage({ conversationId, messageId: data.message.id, authorId: data.message.authorId })
        return { ok: true, message: data.message }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível enviar a mensagem"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [mergeMessage]
  )

  const editMessage = React.useCallback(
    async (conversationId: string, id: string, text: string): Promise<ActionResult> => {
      try {
        const data = await api<{ message: ChatMessage }>(
          `/api/chat-interno/conversations/${conversationId}/messages/${id}`,
          { method: "PATCH", body: JSON.stringify({ text }) }
        )
        mergeMessage(conversationId, data.message)
        void broadcastMessageUpdated({ conversationId, messageId: data.message.id, authorId: data.message.authorId })
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível editar a mensagem"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [mergeMessage]
  )

  const deleteMessageForMe = React.useCallback((id: string): ActionResult => {
    setHiddenForMe((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveHiddenForMe(next)
      return next
    })
    return { ok: true }
  }, [])

  const deleteMessageForEveryone = React.useCallback(
    async (conversationId: string, id: string): Promise<ActionResult> => {
      try {
        const data = await api<{ message: ChatMessage }>(
          `/api/chat-interno/conversations/${conversationId}/messages/${id}/delete`,
          { method: "POST" }
        )
        mergeMessage(conversationId, data.message)
        void broadcastMessageUpdated({ conversationId, messageId: data.message.id, authorId: data.message.authorId })
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível apagar a mensagem"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [mergeMessage]
  )

  const toggleReaction = React.useCallback(
    async (conversationId: string, id: string, emoji: string) => {
      try {
        const data = await api<{ message: ChatMessage }>(
          `/api/chat-interno/conversations/${conversationId}/messages/${id}/react`,
          { method: "POST", body: JSON.stringify({ emoji }) }
        )
        mergeMessage(conversationId, data.message)
        void broadcastMessageUpdated({ conversationId, messageId: data.message.id, authorId: data.message.authorId })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível reagir à mensagem")
      }
    },
    [mergeMessage]
  )

  const setTyping = React.useCallback(
    (conversationId: string) => {
      const user = currentUserRef.current
      if (!user) return
      void broadcastTyping(conversationId, user.id, user.name)
    },
    []
  )

  const markConversationSeen = React.useCallback((conversationId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }))
    void api(`/api/chat-interno/conversations/${conversationId}/seen`, { method: "POST" }).catch(() => {})
  }, [])

  // -------------------------------------------------------------------
  // Calls
  // -------------------------------------------------------------------

  const startCall = React.useCallback(
    async (conversationId: string, kind: "audio" | "video"): Promise<ActionResult & { call?: Call }> => {
      try {
        const data = await api<{ call: Call }>(`/api/chat-interno/conversations/${conversationId}/calls`, {
          method: "POST",
          body: JSON.stringify({ kind }),
        })
        applyCallUpdate(data.call)
        void broadcastCallUpdated(data.call.id)
        // No caller-side timeout here: each invited participant's own
        // client (GlobalCallOverlay) runs its own 30s timer and calls
        // missCall for itself. That's what lets one person's timeout drop
        // only their ring, never the whole group's.
        return { ok: true, call: data.call }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível iniciar a chamada"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyCallUpdate]
  )

  const answerCall = React.useCallback(
    async (callId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ call: Call }>(`/api/chat-interno/calls/${callId}/answer`, { method: "POST" })
        applyCallUpdate(data.call)
        void broadcastCallUpdated(data.call.id)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível atender a chamada"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyCallUpdate]
  )

  const declineCall = React.useCallback(
    async (callId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ call: Call }>(`/api/chat-interno/calls/${callId}/decline`, { method: "POST" })
        applyCallUpdate(data.call)
        void broadcastCallUpdated(data.call.id)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível recusar a chamada"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyCallUpdate]
  )

  const missCall = React.useCallback(
    async (callId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ call: Call }>(`/api/chat-interno/calls/${callId}/miss`, { method: "POST" })
        applyCallUpdate(data.call)
        void broadcastCallUpdated(data.call.id)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro inesperado"
        return { ok: false, error: message }
      }
    },
    [applyCallUpdate]
  )

  const endCall = React.useCallback(
    async (callId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ call: Call }>(`/api/chat-interno/calls/${callId}/end`, { method: "POST" })
        applyCallUpdate(data.call)
        void broadcastCallUpdated(data.call.id)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível encerrar a chamada"
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [applyCallUpdate]
  )

  const value = React.useMemo<ChatInternoContextValue>(
    () => ({
      conversations,
      calls,
      typing,
      getConversation,
      getMessagesFor,
      loadMessages,
      getMessage,
      isPinned,
      getPinnedCount,
      getPinnedMessagesFor,
      loadPinnedMessages,
      pinMessage,
      unpinMessage,
      getCall,
      refreshCall,
      getUnreadCount,
      hasUnread,
      setActiveConversationId,
      createDmConversation,
      createGroup,
      renameGroup,
      updateGroupDescription,
      addGroupMembers,
      removeGroupMember,
      leaveGroup,
      toggleGroupAdmin,
      sendMessage,
      editMessage,
      deleteMessageForMe,
      deleteMessageForEveryone,
      toggleReaction,
      setTyping,
      markConversationSeen,
      startCall,
      answerCall,
      declineCall,
      missCall,
      endCall,
    }),
    [
      conversations,
      calls,
      typing,
      getConversation,
      getMessagesFor,
      loadMessages,
      getMessage,
      isPinned,
      getPinnedCount,
      getPinnedMessagesFor,
      loadPinnedMessages,
      pinMessage,
      unpinMessage,
      getCall,
      refreshCall,
      getUnreadCount,
      hasUnread,
      setActiveConversationId,
      createDmConversation,
      createGroup,
      renameGroup,
      updateGroupDescription,
      addGroupMembers,
      removeGroupMember,
      leaveGroup,
      toggleGroupAdmin,
      sendMessage,
      editMessage,
      deleteMessageForMe,
      deleteMessageForEveryone,
      toggleReaction,
      setTyping,
      markConversationSeen,
      startCall,
      answerCall,
      declineCall,
      missCall,
      endCall,
    ]
  )

  return <ChatInternoContext.Provider value={value}>{children}</ChatInternoContext.Provider>
}

export function useChatInterno() {
  const ctx = React.useContext(ChatInternoContext)
  if (!ctx) {
    throw new Error("useChatInterno must be used within a ChatInternoProvider")
  }
  return ctx
}
