"use client"

import * as React from "react"

import { useCurrentUser } from "@/lib/current-user/context"
import type {
  CardCoverType,
  CardPriority,
  KanbanActivityLogEntry,
  KanbanAttachment,
  KanbanBoard,
  KanbanCard,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanColumn,
  KanbanComment,
  KanbanLabel,
  KanbanNotification,
  RecurrenceType,
  ReminderType,
} from "@/components/kanban/types"
import { uploadAttachments, validateFile } from "@/lib/kanban/upload"
import { computeReminderAt, notificationDedupeKey } from "@/lib/kanban/notifications"
import type { CardStats } from "@/lib/kanban/server"

export interface ActionResult {
  ok: boolean
  error?: string
}

const BOARDS_POLL_INTERVAL_MS = 30_000

function now() {
  return new Date().toISOString()
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

// ---------------------------------------------------------------------------
// Notifications reducer — the one remaining local-only, not-persisted piece.
// Reminders/due-date notifications are computed client-side from card data
// (see lib/kanban/notifications.ts), not backed by a table yet.
// ---------------------------------------------------------------------------

interface KanbanMockState {
  notifications: KanbanNotification[]
}

type MockAction =
  | { type: "ADD_NOTIFICATION"; notification: KanbanNotification }
  | { type: "UPDATE_NOTIFICATION"; id: string; changes: Partial<KanbanNotification> }
  | { type: "REMOVE_NOTIFICATION"; id: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }

function mockReducer(state: KanbanMockState, action: MockAction): KanbanMockState {
  switch (action.type) {
    case "ADD_NOTIFICATION":
      if (state.notifications.some((n) => n.id === action.notification.id)) return state
      return { ...state, notifications: [action.notification, ...state.notifications] }
    case "UPDATE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, ...action.changes, updatedAt: now() } : n
        ),
      }
    case "REMOVE_NOTIFICATION":
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) }
    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.readAt ? n : { ...n, readAt: now() })),
      }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface CreateBoardInput {
  title: string
  description?: string
  backgroundValue: string
  isDefault?: boolean
}

export interface SetDueDateInput {
  startAt?: string
  dueAt?: string
  reminderType?: ReminderType
  reminderCustomMinutes?: number
  recurrenceType?: RecurrenceType
  recurrenceCustomDays?: number
}

interface KanbanContextValue {
  boardsForUser: KanbanBoard[]
  archivedBoardsForUser: KanbanBoard[]
  activeBoard: KanbanBoard | null
  setActiveBoard: (id: string | null) => void
  getBoard: (id: string) => KanbanBoard | undefined
  createBoard: (input: CreateBoardInput) => Promise<ActionResult & { board?: KanbanBoard }>
  updateBoard: (
    id: string,
    changes: Partial<Pick<KanbanBoard, "title" | "description" | "backgroundValue">>
  ) => Promise<ActionResult>
  setDefaultBoard: (id: string) => Promise<ActionResult>
  archiveBoard: (id: string) => Promise<ActionResult>
  restoreBoard: (id: string) => Promise<ActionResult>
  deleteBoardPermanent: (id: string) => Promise<ActionResult>
  duplicateBoard: (id: string) => Promise<ActionResult & { board?: KanbanBoard }>

  columnsForBoard: (boardId: string) => KanbanColumn[]
  archivedColumnsForBoard: (boardId: string) => KanbanColumn[]
  createColumn: (boardId: string, title: string) => Promise<ActionResult>
  updateColumn: (
    id: string,
    changes: Partial<Pick<KanbanColumn, "title" | "color" | "isDoneColumn">>
  ) => Promise<ActionResult>
  moveColumn: (id: string, beforeId: string | null, afterId: string | null) => Promise<ActionResult>
  duplicateColumn: (id: string) => Promise<ActionResult>
  archiveColumn: (id: string, archiveCards: boolean) => Promise<ActionResult>
  restoreColumn: (id: string) => Promise<ActionResult>
  deleteColumnPermanent: (id: string) => Promise<ActionResult>

  cardsForColumn: (columnId: string) => KanbanCard[]
  archivedCardsForBoard: (boardId: string) => KanbanCard[]
  getCard: (id: string) => KanbanCard | undefined
  createCard: (boardId: string, columnId: string, title: string) => Promise<ActionResult & { card?: KanbanCard }>
  updateCardTitle: (id: string, title: string) => Promise<ActionResult>
  updateCardDescription: (id: string, description: string) => Promise<ActionResult>
  moveCard: (id: string, toColumnId: string, beforeId: string | null, afterId: string | null) => Promise<ActionResult>
  reorderCardsInColumn: (columnId: string, orderedIds: string[]) => Promise<ActionResult>
  duplicateCard: (id: string) => Promise<ActionResult>
  completeCard: (id: string) => Promise<ActionResult>
  reopenCard: (id: string) => Promise<ActionResult>
  archiveCard: (id: string) => Promise<ActionResult>
  restoreCard: (id: string) => Promise<ActionResult>
  deleteCardPermanent: (id: string) => Promise<ActionResult>
  setPriority: (id: string, priority: CardPriority) => Promise<ActionResult>
  setDueDate: (id: string, input: SetDueDateInput) => Promise<ActionResult>
  removeDueDate: (id: string) => Promise<ActionResult>
  setCover: (id: string, coverType: CardCoverType, coverValue?: string) => Promise<ActionResult>

  labelsForUser: KanbanLabel[]
  getLabel: (id: string) => KanbanLabel | undefined
  createLabel: (name: string, color: string) => Promise<ActionResult>
  updateLabel: (id: string, changes: Partial<Pick<KanbanLabel, "name" | "color">>) => Promise<ActionResult>
  deleteLabel: (id: string) => Promise<ActionResult>
  toggleCardLabel: (cardId: string, labelId: string) => Promise<ActionResult>

  // -- phase 2 (attachments/notifications still local-only / not persisted) --
  loadChecklistsForCard: (cardId: string) => Promise<void>
  getChecklistsForCard: (cardId: string) => KanbanChecklist[]
  getChecklistItems: (checklistId: string) => KanbanChecklistItem[]
  checklistProgress: (cardId: string) => { completed: number; total: number }
  createChecklist: (cardId: string, title: string) => Promise<ActionResult>
  updateChecklist: (id: string, title: string) => Promise<ActionResult>
  deleteChecklist: (id: string) => Promise<ActionResult>
  createChecklistItem: (checklistId: string, title: string) => Promise<ActionResult>
  updateChecklistItem: (id: string, title: string) => Promise<ActionResult>
  toggleChecklistItem: (id: string) => Promise<ActionResult>
  deleteChecklistItem: (id: string) => Promise<ActionResult>

  loadCommentsForCard: (cardId: string) => Promise<void>
  getCommentsForCard: (cardId: string) => KanbanComment[]
  addComment: (cardId: string, content: string) => Promise<ActionResult>
  editComment: (id: string, content: string) => Promise<ActionResult>
  deleteComment: (id: string, cardId: string) => Promise<ActionResult>

  loadAttachmentsForCard: (cardId: string) => Promise<void>
  getAttachmentsForCard: (cardId: string) => KanbanAttachment[]
  addAttachments: (cardId: string, files: File[]) => Promise<{ ok: boolean; errors: string[] }>
  removeAttachment: (id: string, cardId: string) => Promise<ActionResult>
  setCoverAttachment: (cardId: string, attachmentId: string | null) => Promise<ActionResult>

  loadActivityForCard: (cardId: string) => Promise<void>
  getActivityForCard: (cardId: string) => KanbanActivityLogEntry[]

  notificationsForUser: KanbanNotification[]
  activeNotificationsForUser: KanbanNotification[]
  unreadCount: number
  nextPopupNotification: KanbanNotification | null
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  snoozeNotification: (id: string, minutes: number) => void
  snoozeNotificationUntil: (id: string, untilISO: string) => void
  removeNotification: (id: string) => void
  completeFromNotification: (id: string, cardId: string) => void
}

const KanbanContext = React.createContext<KanbanContextValue | null>(null)

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser()
  const currentUserId = currentUser?.id ?? ""

  // -------------------------------------------------------------------
  // Real state — boards/columns/cards/labels
  // -------------------------------------------------------------------

  const [boards, setBoards] = React.useState<KanbanBoard[]>([])
  const [columns, setColumns] = React.useState<KanbanColumn[]>([])
  const [cards, setCards] = React.useState<KanbanCard[]>([])
  const [labels, setLabels] = React.useState<KanbanLabel[]>([])
  const [activeBoardId, setActiveBoardId] = React.useState<string | null>(null)

  const cardsRef = React.useRef(cards)
  React.useEffect(() => {
    cardsRef.current = cards
  }, [cards])

  const [cardStats, setCardStats] = React.useState<Record<string, CardStats>>({})

  const patchCardStats = React.useCallback((cardId: string, delta: Partial<CardStats>) => {
    setCardStats((prev) => {
      const current = prev[cardId] ?? { checklistTotal: 0, checklistCompleted: 0, commentCount: 0, attachmentCount: 0 }
      return {
        ...prev,
        [cardId]: {
          checklistTotal: current.checklistTotal + (delta.checklistTotal ?? 0),
          checklistCompleted: current.checklistCompleted + (delta.checklistCompleted ?? 0),
          commentCount: current.commentCount + (delta.commentCount ?? 0),
          attachmentCount: current.attachmentCount + (delta.attachmentCount ?? 0),
        },
      }
    })
  }, [])

  const refreshBoards = React.useCallback(async () => {
    try {
      const data = await api<{
        boards: KanbanBoard[]
        columns: KanbanColumn[]
        cards: KanbanCard[]
        labels: KanbanLabel[]
        cardStats: Record<string, CardStats>
      }>("/api/kanban/boards")
      setBoards(data.boards)
      setColumns(data.columns)
      setCards(data.cards)
      setLabels(data.labels)
      setCardStats(data.cardStats)
    } catch {
      // silent — poll retries
    }
  }, [])

  React.useEffect(() => {
    refreshBoards()
    const interval = window.setInterval(refreshBoards, BOARDS_POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [refreshBoards])

  const setActiveBoard = React.useCallback((id: string | null) => setActiveBoardId(id), [])

  const boardsForUser = React.useMemo(
    () => boards.filter((b) => !b.archivedAt).sort((a, b) => a.position - b.position),
    [boards]
  )
  const archivedBoardsForUser = React.useMemo(() => boards.filter((b) => !!b.archivedAt), [boards])
  const activeBoard = React.useMemo(() => {
    if (activeBoardId) {
      const found = boardsForUser.find((b) => b.id === activeBoardId)
      if (found) return found
    }
    return boardsForUser.find((b) => b.isDefault) ?? boardsForUser[0] ?? null
  }, [activeBoardId, boardsForUser])
  const getBoard = React.useCallback((id: string) => boards.find((b) => b.id === id), [boards])

  const createBoard = React.useCallback(
    async (input: CreateBoardInput): Promise<ActionResult & { board?: KanbanBoard }> => {
      if (!input.title.trim()) return { ok: false, error: "Informe um nome para o quadro" }
      try {
        const data = await api<{ board: KanbanBoard }>("/api/kanban/boards", {
          method: "POST",
          body: JSON.stringify(input),
        })
        setBoards((prev) => [
          ...prev.map((b) => (data.board.isDefault ? { ...b, isDefault: false } : b)),
          data.board,
        ])
        setActiveBoard(data.board.id)
        return { ok: true, board: data.board }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [setActiveBoard]
  )

  const updateBoard = React.useCallback(
    async (
      id: string,
      changes: Partial<Pick<KanbanBoard, "title" | "description" | "backgroundValue">>
    ): Promise<ActionResult> => {
      try {
        const data = await api<{ board: KanbanBoard }>(`/api/kanban/boards/${id}`, {
          method: "PATCH",
          body: JSON.stringify(changes),
        })
        setBoards((prev) => prev.map((b) => (b.id === id ? data.board : b)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const setDefaultBoard = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      const data = await api<{ board: KanbanBoard }>(`/api/kanban/boards/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      })
      setBoards((prev) => prev.map((b) => (b.id === id ? data.board : { ...b, isDefault: false })))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const setBoardArchived = React.useCallback(
    async (id: string, archived: boolean): Promise<ActionResult> => {
      try {
        const data = await api<{ board: KanbanBoard }>(`/api/kanban/boards/${id}/archive`, {
          method: "POST",
          body: JSON.stringify({ archived }),
        })
        setBoards((prev) => prev.map((b) => (b.id === id ? data.board : b)))
        if (archived) setActiveBoardId((prev) => (prev === id ? null : prev))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )
  const archiveBoard = React.useCallback((id: string) => setBoardArchived(id, true), [setBoardArchived])
  const restoreBoard = React.useCallback((id: string) => setBoardArchived(id, false), [setBoardArchived])

  const deleteBoardPermanent = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      await api(`/api/kanban/boards/${id}`, { method: "DELETE" })
      setBoards((prev) => prev.filter((b) => b.id !== id))
      setColumns((prev) => prev.filter((c) => c.boardId !== id))
      setCards((prev) => prev.filter((c) => c.boardId !== id))
      setActiveBoardId((prev) => (prev === id ? null : prev))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const duplicateBoard = React.useCallback(
    async (id: string): Promise<ActionResult & { board?: KanbanBoard }> => {
      try {
        const data = await api<{ board: KanbanBoard }>(`/api/kanban/boards/${id}/duplicate`, {
          method: "POST",
        })
        await refreshBoards()
        setActiveBoard(data.board.id)
        return { ok: true, board: data.board }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [refreshBoards, setActiveBoard]
  )

  // -------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------

  const columnsForBoard = React.useCallback(
    (boardId: string) =>
      columns.filter((c) => c.boardId === boardId && !c.archivedAt).sort((a, b) => a.position - b.position),
    [columns]
  )
  const archivedColumnsForBoard = React.useCallback(
    (boardId: string) => columns.filter((c) => c.boardId === boardId && !!c.archivedAt),
    [columns]
  )

  const createColumn = React.useCallback(async (boardId: string, title: string): Promise<ActionResult> => {
    if (!title.trim()) return { ok: false, error: "Informe um nome para a coluna" }
    try {
      const data = await api<{ column: KanbanColumn }>(`/api/kanban/boards/${boardId}/columns`, {
        method: "POST",
        body: JSON.stringify({ title }),
      })
      setColumns((prev) => [...prev, data.column])
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const updateColumn = React.useCallback(
    async (
      id: string,
      changes: Partial<Pick<KanbanColumn, "title" | "color" | "isDoneColumn">>
    ): Promise<ActionResult> => {
      try {
        const data = await api<{ column: KanbanColumn }>(`/api/kanban/columns/${id}`, {
          method: "PATCH",
          body: JSON.stringify(changes),
        })
        setColumns((prev) => prev.map((c) => (c.id === id ? data.column : c)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const moveColumn = React.useCallback(
    async (id: string, beforeId: string | null, afterId: string | null): Promise<ActionResult> => {
      try {
        await api(`/api/kanban/columns/${id}/move`, {
          method: "POST",
          body: JSON.stringify({ beforeId, afterId }),
        })
        // A move can trigger a rebalance across every sibling column, so
        // refetch everything rather than patch just the moved row.
        await refreshBoards()
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [refreshBoards]
  )

  const duplicateColumn = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        await api(`/api/kanban/columns/${id}/duplicate`, { method: "POST" })
        await refreshBoards()
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [refreshBoards]
  )

  const setColumnArchived = React.useCallback(
    async (id: string, archived: boolean, archiveCards?: boolean): Promise<ActionResult> => {
      try {
        await api(`/api/kanban/columns/${id}/archive`, {
          method: "POST",
          body: JSON.stringify({ archived, archiveCards }),
        })
        await refreshBoards()
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [refreshBoards]
  )
  const archiveColumn = React.useCallback(
    (id: string, archiveCards: boolean) => setColumnArchived(id, true, archiveCards),
    [setColumnArchived]
  )
  const restoreColumn = React.useCallback((id: string) => setColumnArchived(id, false), [setColumnArchived])

  const deleteColumnPermanent = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      await api(`/api/kanban/columns/${id}`, { method: "DELETE" })
      setColumns((prev) => prev.filter((c) => c.id !== id))
      setCards((prev) => prev.filter((c) => c.columnId !== id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  // -------------------------------------------------------------------
  // Cards
  // -------------------------------------------------------------------

  const cardsForColumn = React.useCallback(
    (columnId: string) =>
      cards.filter((c) => c.columnId === columnId && !c.archivedAt).sort((a, b) => a.position - b.position),
    [cards]
  )
  const archivedCardsForBoard = React.useCallback(
    (boardId: string) => cards.filter((c) => c.boardId === boardId && !!c.archivedAt),
    [cards]
  )
  const getCard = React.useCallback((id: string) => cards.find((c) => c.id === id), [cards])

  const createCard = React.useCallback(
    async (
      _boardId: string,
      columnId: string,
      title: string
    ): Promise<ActionResult & { card?: KanbanCard }> => {
      if (!title.trim()) return { ok: false, error: "Informe um título para a atividade" }
      try {
        const data = await api<{ card: KanbanCard }>(`/api/kanban/columns/${columnId}/cards`, {
          method: "POST",
          body: JSON.stringify({ title }),
        })
        setCards((prev) => [...prev, data.card])
        return { ok: true, card: data.card }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const patchCard = React.useCallback(
    async (id: string, body: Record<string, unknown>): Promise<ActionResult> => {
      try {
        const data = await api<{ card: KanbanCard }>(`/api/kanban/cards/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
        setCards((prev) => prev.map((c) => (c.id === id ? data.card : c)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const updateCardTitle = React.useCallback(
    (id: string, title: string) => {
      if (!title.trim()) return Promise.resolve({ ok: false, error: "Informe um título" })
      return patchCard(id, { title })
    },
    [patchCard]
  )
  const updateCardDescription = React.useCallback(
    (id: string, description: string) => patchCard(id, { description }),
    [patchCard]
  )
  const setPriority = React.useCallback(
    (id: string, priority: CardPriority) => patchCard(id, { priority }),
    [patchCard]
  )
  const setCover = React.useCallback(
    (id: string, coverType: CardCoverType, coverValue?: string) =>
      patchCard(id, { coverType, coverValue: coverValue ?? null }),
    [patchCard]
  )
  const setDueDate = React.useCallback(
    (id: string, input: SetDueDateInput) => patchCard(id, { ...input }),
    [patchCard]
  )
  const removeDueDate = React.useCallback(
    (id: string) =>
      patchCard(id, {
        startAt: null,
        dueAt: null,
        reminderType: null,
        reminderCustomMinutes: null,
        recurrenceType: null,
        recurrenceCustomDays: null,
      }),
    [patchCard]
  )

  const moveCard = React.useCallback(
    async (
      id: string,
      toColumnId: string,
      beforeId: string | null,
      afterId: string | null
    ): Promise<ActionResult> => {
      try {
        const data = await api<{ card: KanbanCard }>(`/api/kanban/cards/${id}/move`, {
          method: "POST",
          body: JSON.stringify({ toColumnId, beforeId, afterId }),
        })
        setCards((prev) => prev.map((c) => (c.id === id ? data.card : c)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const duplicateCard = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      const data = await api<{ card: KanbanCard }>(`/api/kanban/cards/${id}/duplicate`, { method: "POST" })
      setCards((prev) => [...prev, data.card])
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const setCardCompleted = React.useCallback(async (id: string, completed: boolean): Promise<ActionResult> => {
    try {
      const data = await api<{ card: KanbanCard }>(`/api/kanban/cards/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ completed }),
      })
      setCards((prev) => prev.map((c) => (c.id === id ? data.card : c)))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])
  const completeCard = React.useCallback((id: string) => setCardCompleted(id, true), [setCardCompleted])
  const reopenCard = React.useCallback((id: string) => setCardCompleted(id, false), [setCardCompleted])

  const setCardArchived = React.useCallback(async (id: string, archived: boolean): Promise<ActionResult> => {
    try {
      const data = await api<{ card: KanbanCard }>(`/api/kanban/cards/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({ archived }),
      })
      setCards((prev) => prev.map((c) => (c.id === id ? data.card : c)))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])
  const archiveCard = React.useCallback((id: string) => setCardArchived(id, true), [setCardArchived])
  const restoreCard = React.useCallback((id: string) => setCardArchived(id, false), [setCardArchived])

  const deleteCardPermanent = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      await api(`/api/kanban/cards/${id}`, { method: "DELETE" })
      setCards((prev) => prev.filter((c) => c.id !== id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const reorderCardsInColumn = React.useCallback(
    async (columnId: string, orderedIds: string[]): Promise<ActionResult> => {
      setCards((prev) =>
        prev.map((c) => {
          const index = orderedIds.indexOf(c.id)
          return index === -1 ? c : { ...c, position: (index + 1) * 1000 }
        })
      )
      try {
        await api(`/api/kanban/columns/${columnId}/reorder`, {
          method: "POST",
          body: JSON.stringify({ orderedIds }),
        })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const toggleCardLabel = React.useCallback(async (cardId: string, labelId: string): Promise<ActionResult> => {
    try {
      const data = await api<{ card: KanbanCard }>(`/api/kanban/cards/${cardId}/toggle-label`, {
        method: "POST",
        body: JSON.stringify({ labelId }),
      })
      setCards((prev) => prev.map((c) => (c.id === cardId ? data.card : c)))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  // -------------------------------------------------------------------
  // Labels
  // -------------------------------------------------------------------

  const labelsForUser = labels
  const getLabel = React.useCallback((id: string) => labels.find((l) => l.id === id), [labels])

  const createLabel = React.useCallback(async (name: string, color: string): Promise<ActionResult> => {
    if (!name.trim()) return { ok: false, error: "Informe um nome para a etiqueta" }
    try {
      const data = await api<{ label: KanbanLabel }>("/api/kanban/labels", {
        method: "POST",
        body: JSON.stringify({ name, color }),
      })
      setLabels((prev) => [...prev, data.label])
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const updateLabel = React.useCallback(
    async (id: string, changes: Partial<Pick<KanbanLabel, "name" | "color">>): Promise<ActionResult> => {
      try {
        const data = await api<{ label: KanbanLabel }>(`/api/kanban/labels/${id}`, {
          method: "PATCH",
          body: JSON.stringify(changes),
        })
        setLabels((prev) => prev.map((l) => (l.id === id ? data.label : l)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const deleteLabel = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      await api(`/api/kanban/labels/${id}`, { method: "DELETE" })
      setLabels((prev) => prev.filter((l) => l.id !== id))
      setCards((prev) => prev.map((c) => ({ ...c, labelIds: c.labelIds.filter((l) => l !== id) })))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  // -------------------------------------------------------------------
  // Phase 2 — checklists/comments/attachments/activity/notifications.
  // Local-only, not persisted. requireOwnCard checks ownership against the
  // real `cards` state, so this still behaves correctly for real cards —
  // it just doesn't survive a refresh yet.
  // -------------------------------------------------------------------

  const [mockState, mockDispatch] = React.useReducer(mockReducer, {
    notifications: [],
  })

  // Reminders aren't backed by a table or cron job (see comment above) — this
  // is the piece that actually makes the reminder offset a user picks on a
  // card (DueDatePicker) do something, by checking every 30s whether any
  // card's computed reminder instant has elapsed and pushing a local
  // notification. Only fires while this provider is mounted (i.e. the tab is
  // open); notificationDedupeKey + firedReminderKeysRef keep a given
  // card+instant from ever firing twice in the same session.
  const firedReminderKeysRef = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    function checkReminders() {
      const nowMs = Date.now()
      for (const card of cardsRef.current) {
        if (card.archivedAt || card.completedAt) continue
        const reminderAt = computeReminderAt(card)
        if (!reminderAt || new Date(reminderAt).getTime() > nowMs) continue
        const key = notificationDedupeKey(card.id, "due_reminder", reminderAt)
        if (firedReminderKeysRef.current.has(key)) continue
        firedReminderKeysRef.current.add(key)
        const at = now()
        mockDispatch({
          type: "ADD_NOTIFICATION",
          notification: {
            id: key,
            userId: currentUserId,
            boardId: card.boardId,
            cardId: card.id,
            type: "due_reminder",
            title: card.title,
            message: `Lembrete: "${card.title}" vence em breve`,
            scheduledAt: reminderAt,
            createdAt: at,
            updatedAt: at,
          },
        })
      }
    }
    const initial = window.setTimeout(checkReminders, 0)
    const interval = window.setInterval(checkReminders, 30_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [currentUserId])

  const requireOwnCard = React.useCallback(
    (id: string): KanbanCard | null => {
      const card = cardsRef.current.find((c) => c.id === id)
      if (!card || card.userId !== currentUserId) return null
      return card
    },
    [currentUserId]
  )

  const [checklists, setChecklists] = React.useState<KanbanChecklist[]>([])
  const [checklistItems, setChecklistItems] = React.useState<KanbanChecklistItem[]>([])
  const checklistsRef = React.useRef(checklists)
  React.useEffect(() => {
    checklistsRef.current = checklists
  }, [checklists])

  const loadChecklistsForCard = React.useCallback(async (cardId: string) => {
    try {
      const data = await api<{ checklists: KanbanChecklist[]; items: KanbanChecklistItem[] }>(
        `/api/kanban/cards/${cardId}/checklists`
      )
      // Drop every item belonging to this card's *previous* checklist set
      // (read via ref so this callback never needs `checklists` as a dep —
      // that would recreate it every load and defeat the point of memoizing
      // it), then splice in the freshly-fetched checklists/items for it.
      const staleChecklistIds = new Set(
        checklistsRef.current.filter((cl) => cl.cardId === cardId).map((cl) => cl.id)
      )
      setChecklists((prev) => [...prev.filter((cl) => cl.cardId !== cardId), ...data.checklists])
      setChecklistItems((prev) => [
        ...prev.filter((ci) => !staleChecklistIds.has(ci.checklistId)),
        ...data.items,
      ])
    } catch {
      // silent — reopening the card retries
    }
  }, [])

  const getChecklistsForCard = React.useCallback(
    (cardId: string) => checklists.filter((cl) => cl.cardId === cardId).sort((a, b) => a.position - b.position),
    [checklists]
  )
  const getChecklistItems = React.useCallback(
    (checklistId: string) =>
      checklistItems.filter((ci) => ci.checklistId === checklistId).sort((a, b) => a.position - b.position),
    [checklistItems]
  )
  // Reads from cardStats (bulk-computed on every board load), not the lazy
  // checklists/checklistItems state — this renders on every card face on the
  // board, before the user has ever opened that specific card.
  const checklistProgress = React.useCallback(
    (cardId: string) => {
      const stats = cardStats[cardId]
      return { completed: stats?.checklistCompleted ?? 0, total: stats?.checklistTotal ?? 0 }
    },
    [cardStats]
  )

  const createChecklist = React.useCallback(
    async (cardId: string, title: string): Promise<ActionResult> => {
      if (!title.trim()) return { ok: false, error: "Informe um nome para o checklist" }
      try {
        const data = await api<{ checklist: KanbanChecklist }>(`/api/kanban/cards/${cardId}/checklists`, {
          method: "POST",
          body: JSON.stringify({ title }),
        })
        setChecklists((prev) => [...prev, data.checklist])
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const updateChecklist = React.useCallback(async (id: string, title: string): Promise<ActionResult> => {
    if (!title.trim()) return { ok: false, error: "Informe um nome para o checklist" }
    try {
      const data = await api<{ checklist: KanbanChecklist }>(`/api/kanban/checklists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      })
      setChecklists((prev) => prev.map((cl) => (cl.id === id ? data.checklist : cl)))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const deleteChecklist = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        await api(`/api/kanban/checklists/${id}`, { method: "DELETE" })
        const checklist = checklists.find((cl) => cl.id === id)
        const removedItems = checklistItems.filter((ci) => ci.checklistId === id)
        setChecklists((prev) => prev.filter((cl) => cl.id !== id))
        setChecklistItems((prev) => prev.filter((ci) => ci.checklistId !== id))
        if (checklist) {
          patchCardStats(checklist.cardId, {
            checklistTotal: -removedItems.length,
            checklistCompleted: -removedItems.filter((i) => i.isCompleted).length,
          })
        }
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [checklists, checklistItems, patchCardStats]
  )

  const createChecklistItem = React.useCallback(
    async (checklistId: string, title: string): Promise<ActionResult> => {
      if (!title.trim()) return { ok: false, error: "Informe um item" }
      try {
        const data = await api<{ item: KanbanChecklistItem }>(`/api/kanban/checklists/${checklistId}/items`, {
          method: "POST",
          body: JSON.stringify({ title }),
        })
        setChecklistItems((prev) => [...prev, data.item])
        const checklist = checklists.find((cl) => cl.id === checklistId)
        if (checklist) patchCardStats(checklist.cardId, { checklistTotal: 1 })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [checklists, patchCardStats]
  )

  const updateChecklistItem = React.useCallback(async (id: string, title: string): Promise<ActionResult> => {
    if (!title.trim()) return { ok: false, error: "Informe um item" }
    try {
      const data = await api<{ item: KanbanChecklistItem }>(`/api/kanban/checklist-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      })
      setChecklistItems((prev) => prev.map((ci) => (ci.id === id ? data.item : ci)))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const toggleChecklistItem = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      const item = checklistItems.find((ci) => ci.id === id)
      if (!item) return { ok: false, error: "Item não encontrado" }
      try {
        const nextCompleted = !item.isCompleted
        const data = await api<{ item: KanbanChecklistItem }>(`/api/kanban/checklist-items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ isCompleted: nextCompleted }),
        })
        setChecklistItems((prev) => prev.map((ci) => (ci.id === id ? data.item : ci)))
        const checklist = checklists.find((cl) => cl.id === item.checklistId)
        if (checklist) patchCardStats(checklist.cardId, { checklistCompleted: nextCompleted ? 1 : -1 })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [checklistItems, checklists, patchCardStats]
  )

  const deleteChecklistItem = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        await api(`/api/kanban/checklist-items/${id}`, { method: "DELETE" })
        const item = checklistItems.find((ci) => ci.id === id)
        setChecklistItems((prev) => prev.filter((ci) => ci.id !== id))
        if (item) {
          const checklist = checklists.find((cl) => cl.id === item.checklistId)
          if (checklist) {
            patchCardStats(checklist.cardId, {
              checklistTotal: -1,
              checklistCompleted: item.isCompleted ? -1 : 0,
            })
          }
        }
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [checklistItems, checklists, patchCardStats]
  )

  const [comments, setComments] = React.useState<KanbanComment[]>([])

  const loadCommentsForCard = React.useCallback(async (cardId: string) => {
    try {
      const data = await api<{ comments: KanbanComment[] }>(`/api/kanban/cards/${cardId}/comments`)
      setComments((prev) => [...prev.filter((c) => c.cardId !== cardId), ...data.comments])
    } catch {
      // silent — reopening the card retries
    }
  }, [])

  const getCommentsForCard = React.useCallback(
    (cardId: string) =>
      comments.filter((c) => c.cardId === cardId && !c.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments]
  )

  const addComment = React.useCallback(
    async (cardId: string, content: string): Promise<ActionResult> => {
      if (!content.trim()) return { ok: false, error: "Escreva um comentário" }
      try {
        const data = await api<{ comment: KanbanComment }>(`/api/kanban/cards/${cardId}/comments`, {
          method: "POST",
          body: JSON.stringify({ content }),
        })
        setComments((prev) => [...prev, data.comment])
        patchCardStats(cardId, { commentCount: 1 })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchCardStats]
  )

  const editComment = React.useCallback(async (id: string, content: string): Promise<ActionResult> => {
    if (!content.trim()) return { ok: false, error: "Escreva um comentário" }
    try {
      const data = await api<{ comment: KanbanComment }>(`/api/kanban/comments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      })
      setComments((prev) => prev.map((c) => (c.id === id ? data.comment : c)))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const deleteComment = React.useCallback(
    async (id: string, cardId: string): Promise<ActionResult> => {
      try {
        await api(`/api/kanban/comments/${id}`, { method: "DELETE" })
        setComments((prev) => prev.filter((c) => c.id !== id))
        patchCardStats(cardId, { commentCount: -1 })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchCardStats]
  )

  const [attachments, setAttachments] = React.useState<KanbanAttachment[]>([])

  const loadAttachmentsForCard = React.useCallback(async (cardId: string) => {
    try {
      const data = await api<{ attachments: KanbanAttachment[] }>(`/api/kanban/cards/${cardId}/attachments`)
      setAttachments((prev) => [...prev.filter((a) => a.cardId !== cardId), ...data.attachments])
    } catch {
      // silent — reopening the card retries
    }
  }, [])

  const getAttachmentsForCard = React.useCallback(
    (cardId: string) => attachments.filter((a) => a.cardId === cardId),
    [attachments]
  )

  const addAttachments = React.useCallback(
    async (cardId: string, files: File[]): Promise<{ ok: boolean; errors: string[] }> => {
      if (!requireOwnCard(cardId)) return { ok: false, errors: ["Atividade não encontrada"] }
      const errors: string[] = []
      const valid: File[] = []
      for (const file of files) {
        const error = validateFile(file)
        if (error) errors.push(error)
        else valid.push(file)
      }
      if (valid.length > 0) {
        try {
          const uploaded = await uploadAttachments(cardId, valid)
          setAttachments((prev) => [...prev, ...uploaded])
          patchCardStats(cardId, { attachmentCount: uploaded.length })
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "Não foi possível enviar os anexos")
        }
      }
      return { ok: errors.length === 0, errors }
    },
    [requireOwnCard, patchCardStats]
  )

  const removeAttachment = React.useCallback(
    async (id: string, cardId: string): Promise<ActionResult> => {
      try {
        await api(`/api/kanban/attachments/${id}`, { method: "DELETE" })
        setAttachments((prev) => prev.filter((a) => a.id !== id))
        patchCardStats(cardId, { attachmentCount: -1 })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchCardStats]
  )

  const setCoverAttachment = React.useCallback(async (cardId: string, attachmentId: string | null): Promise<ActionResult> => {
    try {
      if (attachmentId) {
        const data = await api<{ attachment: KanbanAttachment }>(`/api/kanban/attachments/${attachmentId}`, {
          method: "PATCH",
          body: JSON.stringify({ isCover: true }),
        })
        setAttachments((prev) =>
          prev.map((a) => {
            if (a.id === attachmentId) return data.attachment
            return a.cardId === cardId ? { ...a, isCover: false } : a
          })
        )
      } else {
        const current = attachments.find((a) => a.cardId === cardId && a.isCover)
        if (current) {
          await api(`/api/kanban/attachments/${current.id}`, {
            method: "PATCH",
            body: JSON.stringify({ isCover: false }),
          })
          setAttachments((prev) => prev.map((a) => (a.id === current.id ? { ...a, isCover: false } : a)))
        }
      }
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [attachments])

  const [activityByCard, setActivityByCard] = React.useState<Record<string, KanbanActivityLogEntry[]>>({})

  const loadActivityForCard = React.useCallback(async (cardId: string) => {
    try {
      const data = await api<{ activity: KanbanActivityLogEntry[] }>(`/api/kanban/cards/${cardId}/activity`)
      setActivityByCard((prev) => ({ ...prev, [cardId]: data.activity }))
    } catch {
      // silent — reopening the card retries
    }
  }, [])

  const getActivityForCard = React.useCallback(
    (cardId: string) => activityByCard[cardId] ?? [],
    [activityByCard]
  )

  const notificationsForUser = mockState.notifications
  const activeNotificationsForUser = React.useMemo(
    () => notificationsForUser.filter((n) => !n.readAt && !n.snoozedUntil),
    [notificationsForUser]
  )
  const unreadCount = activeNotificationsForUser.length
  const nextPopupNotification = React.useMemo(
    () => [...activeNotificationsForUser].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0] ?? null,
    [activeNotificationsForUser]
  )
  const markNotificationRead = React.useCallback((id: string) => {
    mockDispatch({ type: "UPDATE_NOTIFICATION", id, changes: { readAt: now() } })
  }, [])
  const markAllNotificationsRead = React.useCallback(() => {
    mockDispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" })
  }, [])
  const snoozeNotificationUntil = React.useCallback((id: string, untilISO: string) => {
    mockDispatch({ type: "UPDATE_NOTIFICATION", id, changes: { snoozedUntil: untilISO } })
  }, [])
  const snoozeNotification = React.useCallback(
    (id: string, minutes: number) => snoozeNotificationUntil(id, new Date(Date.now() + minutes * 60_000).toISOString()),
    [snoozeNotificationUntil]
  )
  const removeNotification = React.useCallback((id: string) => {
    mockDispatch({ type: "REMOVE_NOTIFICATION", id })
  }, [])
  const completeFromNotification = React.useCallback(
    (id: string, cardId: string) => {
      completeCard(cardId)
      markNotificationRead(id)
    },
    [completeCard, markNotificationRead]
  )

  // -------------------------------------------------------------------

  const value = React.useMemo<KanbanContextValue>(
    () => ({
      boardsForUser,
      archivedBoardsForUser,
      activeBoard,
      setActiveBoard,
      getBoard,
      createBoard,
      updateBoard,
      setDefaultBoard,
      archiveBoard,
      restoreBoard,
      deleteBoardPermanent,
      duplicateBoard,
      columnsForBoard,
      archivedColumnsForBoard,
      createColumn,
      updateColumn,
      moveColumn,
      duplicateColumn,
      archiveColumn,
      restoreColumn,
      deleteColumnPermanent,
      cardsForColumn,
      archivedCardsForBoard,
      getCard,
      createCard,
      updateCardTitle,
      updateCardDescription,
      moveCard,
      reorderCardsInColumn,
      duplicateCard,
      completeCard,
      reopenCard,
      archiveCard,
      restoreCard,
      deleteCardPermanent,
      setPriority,
      setDueDate,
      removeDueDate,
      setCover,
      labelsForUser,
      getLabel,
      createLabel,
      updateLabel,
      deleteLabel,
      toggleCardLabel,
      loadChecklistsForCard,
      getChecklistsForCard,
      getChecklistItems,
      checklistProgress,
      createChecklist,
      updateChecklist,
      deleteChecklist,
      createChecklistItem,
      updateChecklistItem,
      toggleChecklistItem,
      deleteChecklistItem,
      loadCommentsForCard,
      getCommentsForCard,
      addComment,
      editComment,
      deleteComment,
      loadAttachmentsForCard,
      getAttachmentsForCard,
      addAttachments,
      removeAttachment,
      setCoverAttachment,
      loadActivityForCard,
      getActivityForCard,
      notificationsForUser,
      activeNotificationsForUser,
      unreadCount,
      nextPopupNotification,
      markNotificationRead,
      markAllNotificationsRead,
      snoozeNotification,
      snoozeNotificationUntil,
      removeNotification,
      completeFromNotification,
    }),
    [
      boardsForUser,
      archivedBoardsForUser,
      activeBoard,
      setActiveBoard,
      getBoard,
      createBoard,
      updateBoard,
      setDefaultBoard,
      archiveBoard,
      restoreBoard,
      deleteBoardPermanent,
      duplicateBoard,
      columnsForBoard,
      archivedColumnsForBoard,
      createColumn,
      updateColumn,
      moveColumn,
      duplicateColumn,
      archiveColumn,
      restoreColumn,
      deleteColumnPermanent,
      cardsForColumn,
      archivedCardsForBoard,
      getCard,
      createCard,
      updateCardTitle,
      updateCardDescription,
      moveCard,
      reorderCardsInColumn,
      duplicateCard,
      completeCard,
      reopenCard,
      archiveCard,
      restoreCard,
      deleteCardPermanent,
      setPriority,
      setDueDate,
      removeDueDate,
      setCover,
      labelsForUser,
      getLabel,
      createLabel,
      updateLabel,
      deleteLabel,
      toggleCardLabel,
      loadChecklistsForCard,
      getChecklistsForCard,
      getChecklistItems,
      checklistProgress,
      createChecklist,
      updateChecklist,
      deleteChecklist,
      createChecklistItem,
      updateChecklistItem,
      toggleChecklistItem,
      deleteChecklistItem,
      loadCommentsForCard,
      getCommentsForCard,
      addComment,
      editComment,
      deleteComment,
      loadAttachmentsForCard,
      getAttachmentsForCard,
      addAttachments,
      removeAttachment,
      setCoverAttachment,
      loadActivityForCard,
      getActivityForCard,
      notificationsForUser,
      activeNotificationsForUser,
      unreadCount,
      nextPopupNotification,
      markNotificationRead,
      markAllNotificationsRead,
      snoozeNotification,
      snoozeNotificationUntil,
      removeNotification,
      completeFromNotification,
    ]
  )

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
}

export function useKanban() {
  const ctx = React.useContext(KanbanContext)
  if (!ctx) {
    throw new Error("useKanban must be used within a KanbanProvider")
  }
  return ctx
}
