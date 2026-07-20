"use client"

import * as React from "react"
import { toast } from "sonner"

import type {
  CannedResponse,
  Ticket,
  TicketAttachment,
  TicketMessage,
  TicketPriority,
  TicketSector,
} from "@/components/tickets/types"
import { useCurrentUser } from "@/lib/current-user/context"
import { playTicketNotificationSound } from "@/lib/tickets/notification-sound"
import { notifyBrowser } from "@/lib/notifications/browser-notifications"
import { broadcastTicketMessage, broadcastTicketUpdated, useTicketsActivity } from "@/lib/tickets/realtime"
import { uploadAttachments } from "@/lib/tickets/upload"

// This poll runs app-wide (TicketsProvider is mounted at the root layout,
// not just on ticket pages) — realtime/broadcast is the primary channel,
// this is just the reliability backstop, so it doesn't need to be tight.
const POLL_INTERVAL_MS = 20_000
const HIDDEN_FOR_ME_KEY = "tickets:hidden-for-me"

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

interface CreateTicketInput {
  title: string
  description: string
  priority: TicketPriority
  sector: TicketSector
  attachments: TicketAttachment[]
}

interface UpdateTicketInput {
  title?: string
  description?: string
  sector?: TicketSector
  assigneeId?: string | null
}

interface TicketsContextValue {
  tickets: Ticket[]
  getTicket: (id: string) => Ticket | undefined
  getMessages: (ticketId: string) => TicketMessage[]
  loadMessages: (ticketId: string) => Promise<void>
  createTicket: (input: CreateTicketInput) => Promise<Ticket | null>
  updateTicket: (id: string, changes: UpdateTicketInput) => Promise<boolean>
  closeTicket: (id: string, reason: string) => Promise<boolean>
  reopenTicket: (id: string, reason: string) => Promise<boolean>
  deleteTicket: (id: string, reason: string) => Promise<boolean>
  addMessage: (
    ticketId: string,
    text: string,
    opts?: { attachments?: TicketAttachment[]; replyToId?: string }
  ) => Promise<void>
  editMessage: (ticketId: string, id: string, text: string) => Promise<void>
  deleteMessagesForEveryone: (ticketId: string, ids: string[]) => Promise<void>
  deleteMessagesForMe: (ids: string[]) => void
  reportMessage: (
    ticketId: string,
    messageId: string,
    reason: string,
    description?: string
  ) => Promise<void>
  isCreateDialogOpen: boolean
  openCreateDialog: () => void
  closeCreateDialog: () => void
  hasUnread: (ticketId: string) => boolean
  getUnreadCount: (ticketId: string) => number
  markSeen: (ticketId: string) => void
  unreadTicketIds: string[]
  /** Registers which ticket's chat is currently open, so its own new
   * messages don't also trigger a notification sound (pass null on unmount). */
  setActiveTicketId: (id: string | null) => void

  cannedResponses: CannedResponse[]
  loadCannedResponses: () => Promise<void>
  createCannedResponse: (input: { title: string; body: string; global?: boolean }) => Promise<ActionResult>
  updateCannedResponse: (id: string, changes: { title?: string; body?: string }) => Promise<ActionResult>
  deleteCannedResponse: (id: string) => Promise<ActionResult>

  submitSatisfaction: (ticketId: string, rating: number, comment?: string) => Promise<ActionResult>
}

interface ActionResult {
  ok: boolean
  error?: string
}

const TicketsContext = React.createContext<TicketsContextValue | null>(null)

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser()
  const currentUserRef = React.useRef(currentUser)
  React.useLayoutEffect(() => {
    currentUserRef.current = currentUser
  })
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [messagesByTicket, setMessagesByTicket] = React.useState<Record<string, TicketMessage[]>>({})
  const [unreadCounts, setUnreadCounts] = React.useState<Record<string, number>>({})
  const [hiddenForMe, setHiddenForMe] = React.useState<Set<string>>(() => loadHiddenForMe())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  // Realtime broadcast gives near-instant sound/UI updates, but the poll
  // below is the reliability backstop when a client's network blocks the
  // WebSocket upgrade (confirmed to happen in this environment — see
  // lib/team/presence-realtime.ts). It also drives sound notifications by
  // diffing against the previous snapshot, so alerts still fire even when
  // realtime is silently broken.
  const knownTicketIdsRef = React.useRef<Set<string> | null>(null)
  const prevUnreadRef = React.useRef<Record<string, number> | null>(null)
  // Which ticket's chat is currently open on screen, set by TicketChatPage —
  // lets the sound notification stay quiet for a message the user is already
  // looking at live, same idea as notifyBrowser's own tab-focus check below.
  const activeTicketIdRef = React.useRef<string | null>(null)
  const setActiveTicketId = React.useCallback((id: string | null) => {
    activeTicketIdRef.current = id
  }, [])
  function shouldPlaySoundFor(ticketId: string) {
    if (
      activeTicketIdRef.current === ticketId &&
      document.visibilityState === "visible" &&
      document.hasFocus()
    ) {
      return false
    }
    return true
  }
  // A broadcast-driven message already triggers its own richer notification
  // (author name + text) below, then calls refreshUnread() as well for the
  // badge counts — suppress refreshUnread's own generic sound for that same
  // ticket so one incoming message doesn't "ding" twice.
  const suppressUnreadSoundRef = React.useRef<Set<string>>(new Set())

  const refreshTickets = React.useCallback(async () => {
    try {
      const data = await api<{ tickets: Ticket[] }>("/api/tickets")
      const user = currentUserRef.current
      if (knownTicketIdsRef.current) {
        for (const t of data.tickets) {
          if (
            !knownTicketIdsRef.current.has(t.id) &&
            !t.deleted &&
            t.sector === user?.sector &&
            t.requesterId !== user?.id
          ) {
            playTicketNotificationSound()
            notifyBrowser(`Novo chamado #${t.number}`, t.title, { tag: `ticket-${t.id}` })
            break
          }
        }
      }
      knownTicketIdsRef.current = new Set(data.tickets.map((t) => t.id))
      setTickets(data.tickets)
    } catch {
      // silent — poll/broadcast will retry; avoid toast spam on background refresh
    }
  }, [])

  const refreshUnread = React.useCallback(async () => {
    try {
      const data = await api<{ counts: Record<string, number> }>("/api/tickets/unread")
      if (prevUnreadRef.current) {
        for (const [id, count] of Object.entries(data.counts)) {
          if (count > (prevUnreadRef.current[id] ?? 0)) {
            if (suppressUnreadSoundRef.current.has(id)) {
              suppressUnreadSoundRef.current.delete(id)
            } else if (shouldPlaySoundFor(id)) {
              playTicketNotificationSound()
              notifyBrowser("Novas mensagens no chamado", "Você tem mensagens não lidas.", { tag: `ticket-${id}` })
            }
            break
          }
        }
      }
      prevUnreadRef.current = data.counts
      setUnreadCounts(data.counts)
    } catch {
      // silent, same as above
    }
  }, [])

  React.useEffect(() => {
    function poll() {
      refreshTickets()
      refreshUnread()
    }
    const initial = window.setTimeout(poll, 0)
    const interval = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [refreshTickets, refreshUnread])

  const mergeMessage = React.useCallback((ticketId: string, message: TicketMessage) => {
    setMessagesByTicket((prev) => {
      // Merge even if this ticket's list hasn't loaded yet (e.g. a send
      // racing the initial fetch) — loadMessages() still overwrites this
      // with the authoritative server list once it resolves.
      const existing = prev[ticketId] ?? []
      const withoutDup = existing.filter((m) => m.id !== message.id)
      return { ...prev, [ticketId]: [...withoutDup, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }
    })
  }, [])

  const applyTicketUpdate = React.useCallback((ticket: Ticket) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === ticket.id)
      return exists ? prev.map((t) => (t.id === ticket.id ? ticket : t)) : [ticket, ...prev]
    })
  }, [])

  // The broadcast payload is just an id/metadata pointer now (see
  // lib/tickets/realtime.ts for why) — re-fetch over the authenticated REST API
  // (which enforces canAccessTicket) rather than trusting broadcast content.
  useTicketsActivity(
    React.useCallback(
      (payload: { ticketId: string; messageId: string; authorId: string }) => {
        const isSelf = payload.authorId === currentUser?.id
        const ticket = tickets.find((t) => t.id === payload.ticketId)
        const relevant =
          !!ticket &&
          (ticket.requesterId === currentUser?.id ||
            ticket.assigneeId === currentUser?.id ||
            ticket.sector === currentUser?.sector)
        // Only worth fetching if it's a ticket we already know about and care about
        // (relevant) or already have open (messages loaded) — mirrors the relevance
        // check that used to gate just the notification, now gating the fetch too.
        if (!relevant && !messagesByTicket[payload.ticketId]) return
        api<{ messages: TicketMessage[] }>(`/api/tickets/${payload.ticketId}/messages`)
          .then((data) => {
            setMessagesByTicket((prev) => ({ ...prev, [payload.ticketId]: data.messages }))
            if (isSelf) return
            if (relevant) {
              const message = data.messages.find((m) => m.id === payload.messageId)
              if (message && shouldPlaySoundFor(payload.ticketId)) {
                playTicketNotificationSound()
                notifyBrowser(message.authorName, message.text || "Novo anexo", {
                  tag: `ticket-${payload.ticketId}`,
                })
                suppressUnreadSoundRef.current.add(payload.ticketId)
                window.setTimeout(() => suppressUnreadSoundRef.current.delete(payload.ticketId), 5000)
              }
            }
            refreshUnread()
          })
          .catch(() => {})
      },
      [currentUser, refreshUnread, tickets, messagesByTicket]
    ),
    // No single-ticket GET route exists, and refreshTickets() already does everything
    // needed — re-fetches the (permission-filtered) list and fires the same "new
    // relevant ticket" notification this handler used to compute from the broadcast
    // payload directly.
    React.useCallback(() => {
      void refreshTickets()
    }, [refreshTickets])
  )

  const getTicket = React.useCallback((id: string) => tickets.find((t) => t.id === id), [tickets])

  const getMessages = React.useCallback(
    (ticketId: string) => {
      const list = messagesByTicket[ticketId] ?? []
      return list.map((m) => ({ ...m, deletedForMe: hiddenForMe.has(m.id) }))
    },
    [messagesByTicket, hiddenForMe]
  )

  const loadMessages = React.useCallback(async (ticketId: string) => {
    try {
      const data = await api<{ messages: TicketMessage[] }>(`/api/tickets/${ticketId}/messages`)
      setMessagesByTicket((prev) => ({ ...prev, [ticketId]: data.messages }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as mensagens")
    }
  }, [])

  const createTicket = React.useCallback(
    async (input: CreateTicketInput): Promise<Ticket | null> => {
      try {
        const uploaded = await uploadAttachments(input.attachments)
        const data = await api<{ ticket: Ticket; message: TicketMessage }>("/api/tickets", {
          method: "POST",
          body: JSON.stringify({
            title: input.title,
            description: input.description,
            priority: input.priority,
            sector: input.sector,
            attachments: uploaded,
          }),
        })
        setTickets((prev) => [data.ticket, ...prev])
        setMessagesByTicket((prev) => ({ ...prev, [data.ticket.id]: [data.message] }))
        void broadcastTicketUpdated(data.ticket.id)
        return data.ticket
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível abrir o chamado")
        return null
      }
    },
    []
  )

  const updateTicket = React.useCallback(
    async (id: string, changes: UpdateTicketInput): Promise<boolean> => {
      try {
        const data = await api<{ ticket: Ticket; messages: TicketMessage[] }>(`/api/tickets/${id}`, {
          method: "PATCH",
          body: JSON.stringify(changes),
        })
        applyTicketUpdate(data.ticket)
        setMessagesByTicket((prev) =>
          prev[id] ? { ...prev, [id]: [...prev[id], ...data.messages] } : prev
        )
        void broadcastTicketUpdated(data.ticket.id)
        for (const message of data.messages) {
          void broadcastTicketMessage({ ticketId: id, messageId: message.id, authorId: message.authorId })
        }
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o chamado")
        return false
      }
    },
    [applyTicketUpdate]
  )

  const closeTicket = React.useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      try {
        const data = await api<{ ticket: Ticket; message: TicketMessage }>(`/api/tickets/${id}/close`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        })
        applyTicketUpdate(data.ticket)
        mergeMessage(id, data.message)
        void broadcastTicketUpdated(data.ticket.id)
        void broadcastTicketMessage({ ticketId: id, messageId: data.message.id, authorId: data.message.authorId })
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível encerrar o chamado")
        return false
      }
    },
    [applyTicketUpdate, mergeMessage]
  )

  const reopenTicket = React.useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      try {
        const data = await api<{ ticket: Ticket; message: TicketMessage }>(`/api/tickets/${id}/reopen`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        })
        applyTicketUpdate(data.ticket)
        mergeMessage(id, data.message)
        void broadcastTicketUpdated(data.ticket.id)
        void broadcastTicketMessage({ ticketId: id, messageId: data.message.id, authorId: data.message.authorId })
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível reabrir o chamado")
        return false
      }
    },
    [applyTicketUpdate, mergeMessage]
  )

  const deleteTicket = React.useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      try {
        const data = await api<{ ticket: Ticket }>(`/api/tickets/${id}/delete`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        })
        applyTicketUpdate(data.ticket)
        void broadcastTicketUpdated(data.ticket.id)
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir o chamado")
        return false
      }
    },
    [applyTicketUpdate]
  )

  const addMessage = React.useCallback(
    async (
      ticketId: string,
      text: string,
      opts?: { attachments?: TicketAttachment[]; replyToId?: string }
    ) => {
      try {
        const uploaded = await uploadAttachments(opts?.attachments ?? [])
        const data = await api<{ message: TicketMessage }>(`/api/tickets/${ticketId}/messages`, {
          method: "POST",
          body: JSON.stringify({ text, replyToId: opts?.replyToId, attachments: uploaded }),
        })
        mergeMessage(ticketId, data.message)
        void broadcastTicketMessage({ ticketId, messageId: data.message.id, authorId: data.message.authorId })
        // Bump the ticket's updatedAt locally for list ordering — no need to
        // refetch the entire ticket list for this.
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, updatedAt: data.message.createdAt } : t))
        )
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar a mensagem")
      }
    },
    [mergeMessage]
  )

  const editMessage = React.useCallback(
    async (ticketId: string, id: string, text: string) => {
      try {
        const data = await api<{ message: TicketMessage }>(`/api/tickets/${ticketId}/messages/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ text }),
        })
        mergeMessage(ticketId, data.message)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível editar a mensagem")
      }
    },
    [mergeMessage]
  )

  const deleteMessagesForEveryone = React.useCallback(
    async (ticketId: string, ids: string[]) => {
      for (const id of ids) {
        try {
          const data = await api<{ message: TicketMessage }>(
            `/api/tickets/${ticketId}/messages/${id}/delete`,
            { method: "POST" }
          )
          mergeMessage(ticketId, data.message)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Não foi possível excluir a mensagem")
        }
      }
    },
    [mergeMessage]
  )

  const deleteMessagesForMe = React.useCallback((ids: string[]) => {
    setHiddenForMe((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      saveHiddenForMe(next)
      return next
    })
  }, [])

  const reportMessage = React.useCallback(
    async (ticketId: string, messageId: string, reason: string, description?: string) => {
      try {
        await api(`/api/tickets/${ticketId}/messages/${messageId}/report`, {
          method: "POST",
          body: JSON.stringify({ reason, description }),
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar a denúncia")
      }
    },
    []
  )

  const openCreateDialog = React.useCallback(() => setIsCreateDialogOpen(true), [])
  const closeCreateDialog = React.useCallback(() => setIsCreateDialogOpen(false), [])

  const markSeen = React.useCallback((ticketId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [ticketId]: 0 }))
    void api(`/api/tickets/${ticketId}/seen`, { method: "POST" }).catch(() => {})
  }, [])

  const getUnreadCount = React.useCallback(
    (ticketId: string) => unreadCounts[ticketId] ?? 0,
    [unreadCounts]
  )

  const hasUnread = React.useCallback((ticketId: string) => getUnreadCount(ticketId) > 0, [getUnreadCount])

  const unreadTicketIds = React.useMemo(
    () => Object.keys(unreadCounts).filter((id) => unreadCounts[id] > 0),
    [unreadCounts]
  )

  // -------------------------------------------------------------------
  // Canned responses
  // -------------------------------------------------------------------

  const [cannedResponses, setCannedResponses] = React.useState<CannedResponse[]>([])

  const loadCannedResponses = React.useCallback(async () => {
    try {
      const data = await api<{ responses: CannedResponse[] }>("/api/tickets/canned-responses")
      setCannedResponses(data.responses)
    } catch {
      // silent — reopening the popover retries
    }
  }, [])

  const createCannedResponse = React.useCallback(
    async (input: { title: string; body: string; global?: boolean }): Promise<ActionResult> => {
      try {
        const data = await api<{ response: CannedResponse }>("/api/tickets/canned-responses", {
          method: "POST",
          body: JSON.stringify(input),
        })
        setCannedResponses((prev) => [...prev, data.response].sort((a, b) => a.title.localeCompare(b.title)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const updateCannedResponse = React.useCallback(
    async (id: string, changes: { title?: string; body?: string }): Promise<ActionResult> => {
      try {
        const data = await api<{ response: CannedResponse }>(`/api/tickets/canned-responses/${id}`, {
          method: "PATCH",
          body: JSON.stringify(changes),
        })
        setCannedResponses((prev) => prev.map((r) => (r.id === id ? data.response : r)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const deleteCannedResponse = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      await api(`/api/tickets/canned-responses/${id}`, { method: "DELETE" })
      setCannedResponses((prev) => prev.filter((r) => r.id !== id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const submitSatisfaction = React.useCallback(
    async (ticketId: string, rating: number, comment?: string): Promise<ActionResult> => {
      try {
        const data = await api<{ ticket: Ticket }>(`/api/tickets/${ticketId}/satisfaction`, {
          method: "POST",
          body: JSON.stringify({ rating, comment }),
        })
        applyTicketUpdate(data.ticket)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTicketUpdate]
  )

  const value = React.useMemo<TicketsContextValue>(
    () => ({
      tickets,
      getTicket,
      getMessages,
      loadMessages,
      createTicket,
      updateTicket,
      closeTicket,
      reopenTicket,
      deleteTicket,
      addMessage,
      editMessage,
      deleteMessagesForEveryone,
      deleteMessagesForMe,
      reportMessage,
      isCreateDialogOpen,
      openCreateDialog,
      closeCreateDialog,
      hasUnread,
      getUnreadCount,
      markSeen,
      unreadTicketIds,
      setActiveTicketId,
      cannedResponses,
      loadCannedResponses,
      createCannedResponse,
      updateCannedResponse,
      deleteCannedResponse,
      submitSatisfaction,
    }),
    [
      tickets,
      getTicket,
      getMessages,
      loadMessages,
      createTicket,
      updateTicket,
      closeTicket,
      reopenTicket,
      deleteTicket,
      addMessage,
      editMessage,
      deleteMessagesForEveryone,
      deleteMessagesForMe,
      reportMessage,
      isCreateDialogOpen,
      openCreateDialog,
      closeCreateDialog,
      hasUnread,
      getUnreadCount,
      markSeen,
      unreadTicketIds,
      setActiveTicketId,
      cannedResponses,
      loadCannedResponses,
      createCannedResponse,
      updateCannedResponse,
      deleteCannedResponse,
      submitSatisfaction,
    ]
  )

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
}

export function useTickets() {
  const ctx = React.useContext(TicketsContext)
  if (!ctx) {
    throw new Error("useTickets must be used within a TicketsProvider")
  }
  return ctx
}
