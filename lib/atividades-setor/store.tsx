"use client"

import * as React from "react"

import { useCurrentUser } from "@/lib/current-user/context"
import { getUserRole, type UserRole } from "@/lib/atividades-setor/permissions"
import {
  broadcastActivityUpdated,
  broadcastCommentAdded,
  broadcastTaskUpdated,
  useActivitiesActivity,
} from "@/lib/atividades-setor/realtime"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { uploadAttachments } from "@/lib/atividades-setor/upload"
import type {
  ActivityNotification,
  CalendarEvent,
  ChecklistItem,
  EventFormInput,
  HistoryEntry,
  Task,
  TaskComment,
  TaskFormInput,
  TaskStatus,
} from "@/components/atividades-setor/types"

export interface ActionResult {
  ok: boolean
  error?: string
}

const POLL_INTERVAL_MS = 8_000
const NOTIFICATIONS_POLL_INTERVAL_MS = 60_000

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
  return data as T
}

interface ActivitiesContextValue {
  currentUserId: string
  currentUserSector: string
  isSectorLeader: boolean
  role: UserRole
  managedSectorsForCurrentUser: string[]
  sectors: string[]

  visibleTasks: Task[]
  visibleEvents: CalendarEvent[]
  getTask: (id: string) => Task | undefined
  getEvent: (id: string) => CalendarEvent | undefined
  getComments: (taskId: string) => TaskComment[]
  loadComments: (taskId: string) => Promise<void>
  getChecklist: (taskId: string) => ChecklistItem[]
  loadChecklist: (taskId: string) => Promise<void>
  addChecklistItem: (taskId: string, text: string) => Promise<ActionResult>
  toggleChecklistItem: (taskId: string, itemId: string, done: boolean) => Promise<ActionResult>
  deleteChecklistItem: (taskId: string, itemId: string) => Promise<ActionResult>
  getTaskHistory: (taskId: string) => HistoryEntry[]
  loadTaskHistory: (taskId: string) => Promise<void>

  createTask: (input: TaskFormInput) => Promise<ActionResult & { task?: Task }>
  updateTask: (id: string, input: TaskFormInput) => Promise<ActionResult>
  changeTaskStatus: (id: string, status: TaskStatus) => Promise<ActionResult>
  archiveTask: (id: string) => Promise<ActionResult>
  restoreTask: (id: string) => Promise<ActionResult>
  deleteTask: (id: string) => Promise<ActionResult>
  hardDeleteTask: (id: string) => Promise<ActionResult>
  duplicateTask: (id: string) => Promise<ActionResult & { task?: Task }>

  addComment: (
    taskId: string,
    text: string,
    opts?: { parentId?: string; mentionedUserIds?: string[]; attachments?: TaskComment["attachments"] }
  ) => Promise<ActionResult>
  editComment: (id: string, taskId: string, text: string) => Promise<ActionResult>
  deleteComment: (id: string, taskId: string) => Promise<ActionResult>

  createEvent: (input: EventFormInput) => Promise<ActionResult & { event?: CalendarEvent }>
  updateEvent: (id: string, input: EventFormInput) => Promise<ActionResult>
  deleteEvent: (id: string) => Promise<ActionResult>

  notificationsForCurrentUser: ActivityNotification[]
  unreadNotifications: ActivityNotification[]
  dismissNotification: (id: string) => void
}

const ActivitiesContext = React.createContext<ActivitiesContextValue | null>(null)

export function AtividadesSetorProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser()
  const roster = useChatRoster()

  const [tasks, setTasks] = React.useState<Task[]>([])
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [notifications, setNotifications] = React.useState<ActivityNotification[]>([])
  const [commentsByTask, setCommentsByTask] = React.useState<Record<string, TaskComment[]>>({})
  const [checklistByTask, setChecklistByTask] = React.useState<Record<string, ChecklistItem[]>>({})
  const [historyByTask, setHistoryByTask] = React.useState<Record<string, HistoryEntry[]>>({})

  const currentUserId = currentUser?.id ?? ""
  const currentUserSector = currentUser?.sector ?? ""
  const isSectorLeader = currentUser?.isSectorLeader ?? false
  const role: UserRole = currentUser
    ? getUserRole({
        id: currentUser.id,
        role: currentUser.role,
        sector: currentUser.sector,
        isSectorLeader: currentUser.isSectorLeader,
      })
    : "colaborador"

  const sectors = React.useMemo(() => {
    const set = new Set(roster.map((m) => m.sector))
    if (currentUserSector) set.add(currentUserSector)
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [roster, currentUserSector])

  const managedSectorsForCurrentUser = React.useMemo(() => {
    if (role === "admin") return sectors
    if (role === "gestor") return [currentUserSector]
    return []
  }, [role, sectors, currentUserSector])

  const applyTaskUpdate = React.useCallback((task: Task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id)
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev]
    })
  }, [])
  const applyEventUpdate = React.useCallback((event: CalendarEvent) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === event.id)
      return exists ? prev.map((e) => (e.id === event.id ? event : e)) : [event, ...prev]
    })
  }, [])
  const applyCommentAdded = React.useCallback((comment: TaskComment) => {
    setCommentsByTask((prev) => {
      const existing = prev[comment.taskId] ?? []
      if (existing.some((c) => c.id === comment.id)) return prev
      return { ...prev, [comment.taskId]: [...existing, comment] }
    })
  }, [])

  const refreshTasks = React.useCallback(async () => {
    try {
      const data = await api<{ tasks: Task[] }>("/api/atividades-setor/tasks")
      setTasks(data.tasks)
    } catch {
      // silent — poll/broadcast will retry
    }
  }, [])

  const refreshEvents = React.useCallback(async () => {
    try {
      const data = await api<{ activities: CalendarEvent[] }>("/api/atividades-setor/activities")
      setEvents(data.activities)
    } catch {
      // silent
    }
  }, [])

  const refreshNotifications = React.useCallback(async () => {
    try {
      const data = await api<{ notifications: ActivityNotification[] }>(
        "/api/atividades-setor/notifications/sync",
        { method: "POST" }
      )
      setNotifications(data.notifications)
    } catch {
      // silent
    }
  }, [])

  React.useEffect(() => {
    if (!currentUser) return
    function poll() {
      refreshTasks()
      refreshEvents()
    }
    const initial = window.setTimeout(poll, 0)
    const interval = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [currentUser, refreshTasks, refreshEvents])

  React.useEffect(() => {
    if (!currentUser) return
    const initial = window.setTimeout(refreshNotifications, 0)
    const interval = window.setInterval(refreshNotifications, NOTIFICATIONS_POLL_INTERVAL_MS)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [currentUser, refreshNotifications])

  // The broadcast payload is just an id now (see lib/atividades-setor/realtime.ts for
  // why) — re-fetch over the authenticated REST API rather than trusting broadcast
  // content. Tasks/events always refresh the whole (already permission-filtered) list
  // so a brand-new item still appears live, not just on the next poll. Comments only
  // refetch a task whose thread is already loaded — nothing to update on-screen
  // otherwise, and it avoids fetching every task's comments for every keystroke-driven
  // edit elsewhere in the app.
  useActivitiesActivity(
    React.useCallback(() => {
      void refreshEvents()
    }, [refreshEvents]),
    React.useCallback(
      (taskId: string) => {
        void refreshTasks()
        if (!checklistByTask[taskId]) return
        api<{ items: ChecklistItem[] }>(`/api/atividades-setor/tasks/${taskId}/checklist`)
          .then((data) => setChecklistByTask((prev) => ({ ...prev, [taskId]: data.items })))
          .catch(() => {})
      },
      [refreshTasks, checklistByTask]
    ),
    React.useCallback(
      (taskId: string) => {
        if (!commentsByTask[taskId]) return
        api<{ comments: TaskComment[] }>(`/api/atividades-setor/tasks/${taskId}/comments`)
          .then((data) => setCommentsByTask((prev) => ({ ...prev, [taskId]: data.comments })))
          .catch(() => {})
      },
      [commentsByTask]
    )
  )

  const getTask = React.useCallback((id: string) => tasks.find((t) => t.id === id), [tasks])
  const getEvent = React.useCallback((id: string) => events.find((e) => e.id === id), [events])
  const getComments = React.useCallback(
    (taskId: string) => commentsByTask[taskId] ?? [],
    [commentsByTask]
  )
  const loadComments = React.useCallback(async (taskId: string) => {
    try {
      const data = await api<{ comments: TaskComment[] }>(`/api/atividades-setor/tasks/${taskId}/comments`)
      setCommentsByTask((prev) => ({ ...prev, [taskId]: data.comments }))
    } catch {
      // silent
    }
  }, [])
  const getChecklist = React.useCallback(
    (taskId: string) => checklistByTask[taskId] ?? [],
    [checklistByTask]
  )
  const loadChecklist = React.useCallback(async (taskId: string) => {
    try {
      const data = await api<{ items: ChecklistItem[] }>(`/api/atividades-setor/tasks/${taskId}/checklist`)
      setChecklistByTask((prev) => ({ ...prev, [taskId]: data.items }))
    } catch {
      // silent
    }
  }, [])
  const addChecklistItem = React.useCallback(async (taskId: string, text: string): Promise<ActionResult> => {
    try {
      const data = await api<{ item: ChecklistItem }>(`/api/atividades-setor/tasks/${taskId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ text }),
      })
      setChecklistByTask((prev) => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), data.item] }))
      void broadcastTaskUpdated(taskId)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])
  const toggleChecklistItem = React.useCallback(
    async (taskId: string, itemId: string, done: boolean): Promise<ActionResult> => {
      try {
        const data = await api<{ item: ChecklistItem }>(
          `/api/atividades-setor/tasks/${taskId}/checklist/${itemId}`,
          { method: "PATCH", body: JSON.stringify({ done }) }
        )
        setChecklistByTask((prev) => ({
          ...prev,
          [taskId]: (prev[taskId] ?? []).map((i) => (i.id === itemId ? data.item : i)),
        }))
        void broadcastTaskUpdated(taskId)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )
  const deleteChecklistItem = React.useCallback(async (taskId: string, itemId: string): Promise<ActionResult> => {
    try {
      await api(`/api/atividades-setor/tasks/${taskId}/checklist/${itemId}`, { method: "DELETE" })
      setChecklistByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] ?? []).filter((i) => i.id !== itemId),
      }))
      void broadcastTaskUpdated(taskId)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const getTaskHistory = React.useCallback(
    (taskId: string) => historyByTask[taskId] ?? [],
    [historyByTask]
  )
  const loadTaskHistory = React.useCallback(async (taskId: string) => {
    try {
      const data = await api<{ history: HistoryEntry[] }>(`/api/atividades-setor/tasks/${taskId}/history`)
      setHistoryByTask((prev) => ({ ...prev, [taskId]: data.history }))
    } catch {
      // silent
    }
  }, [])

  // -------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------

  const createTask = React.useCallback(
    async (input: TaskFormInput): Promise<ActionResult & { task?: Task }> => {
      try {
        const attachments = await uploadAttachments(input.attachments)
        const data = await api<{ task: Task }>(`/api/atividades-setor/activities/${input.eventId}/tasks`, {
          method: "POST",
          body: JSON.stringify({ ...input, attachments }),
        })
        applyTaskUpdate(data.task)
        void broadcastTaskUpdated(data.task.id)
        return { ok: true, task: data.task }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTaskUpdate]
  )

  const updateTask = React.useCallback(
    async (id: string, input: TaskFormInput): Promise<ActionResult> => {
      try {
        const newAttachments = input.attachments.filter((a) => a.url.startsWith("blob:"))
        const alreadyUploaded = input.attachments.filter((a) => !a.url.startsWith("blob:"))
        const uploaded = await uploadAttachments(newAttachments)
        const data = await api<{ task: Task }>(`/api/atividades-setor/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...input, attachments: [...alreadyUploaded, ...uploaded] }),
        })
        applyTaskUpdate(data.task)
        void broadcastTaskUpdated(data.task.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTaskUpdate]
  )

  const changeTaskStatus = React.useCallback(
    async (id: string, status: TaskStatus): Promise<ActionResult> => {
      try {
        const data = await api<{ task: Task }>(`/api/atividades-setor/tasks/${id}/status`, {
          method: "POST",
          body: JSON.stringify({ status }),
        })
        applyTaskUpdate(data.task)
        void broadcastTaskUpdated(data.task.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTaskUpdate]
  )

  const archiveTask = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        const data = await api<{ task: Task }>(`/api/atividades-setor/tasks/${id}/archive`, { method: "POST" })
        applyTaskUpdate(data.task)
        void broadcastTaskUpdated(data.task.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTaskUpdate]
  )

  const restoreTask = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        const data = await api<{ task: Task }>(`/api/atividades-setor/tasks/${id}/restore`, { method: "POST" })
        applyTaskUpdate(data.task)
        void broadcastTaskUpdated(data.task.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTaskUpdate]
  )

  const deleteTask = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        const data = await api<{ task: Task }>(`/api/atividades-setor/tasks/${id}/delete`, { method: "POST" })
        applyTaskUpdate(data.task)
        void broadcastTaskUpdated(data.task.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTaskUpdate]
  )

  const hardDeleteTask = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      await api(`/api/atividades-setor/tasks/${id}/hard-delete`, { method: "POST" })
      setTasks((prev) => prev.filter((t) => t.id !== id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const duplicateTask = React.useCallback(
    async (id: string): Promise<ActionResult & { task?: Task }> => {
      try {
        const data = await api<{ task: Task }>(`/api/atividades-setor/tasks/${id}/duplicate`, { method: "POST" })
        applyTaskUpdate(data.task)
        void broadcastTaskUpdated(data.task.id)
        return { ok: true, task: data.task }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyTaskUpdate]
  )

  // -------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------

  const addComment = React.useCallback(
    async (
      taskId: string,
      text: string,
      opts?: { parentId?: string; mentionedUserIds?: string[]; attachments?: TaskComment["attachments"] }
    ): Promise<ActionResult> => {
      try {
        const attachments = await uploadAttachments(opts?.attachments ?? [])
        const data = await api<{ comment: TaskComment; task?: Task }>(
          `/api/atividades-setor/tasks/${taskId}/comments`,
          {
            method: "POST",
            body: JSON.stringify({
              text,
              parentId: opts?.parentId,
              mentionedUserIds: opts?.mentionedUserIds ?? [],
              attachments,
            }),
          }
        )
        applyCommentAdded(data.comment)
        void broadcastCommentAdded(taskId, data.comment.id)
        if (data.task) {
          applyTaskUpdate(data.task)
          void broadcastTaskUpdated(data.task.id)
        }
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyCommentAdded, applyTaskUpdate]
  )

  const editComment = React.useCallback(
    async (id: string, taskId: string, text: string): Promise<ActionResult> => {
      try {
        const data = await api<{ comment: TaskComment }>(
          `/api/atividades-setor/tasks/${taskId}/comments/${id}`,
          { method: "PATCH", body: JSON.stringify({ text }) }
        )
        setCommentsByTask((prev) => ({
          ...prev,
          [taskId]: (prev[taskId] ?? []).map((c) => (c.id === id ? data.comment : c)),
        }))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const deleteComment = React.useCallback(async (id: string, taskId: string): Promise<ActionResult> => {
    try {
      const data = await api<{ comment: TaskComment }>(
        `/api/atividades-setor/tasks/${taskId}/comments/${id}/delete`,
        { method: "POST" }
      )
      setCommentsByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] ?? []).map((c) => (c.id === id ? data.comment : c)),
      }))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  // -------------------------------------------------------------------
  // Events ("atividades")
  // -------------------------------------------------------------------

  const createEvent = React.useCallback(
    async (input: EventFormInput): Promise<ActionResult & { event?: CalendarEvent }> => {
      try {
        const attachments = await uploadAttachments(input.attachments)
        const data = await api<{ activity: CalendarEvent }>("/api/atividades-setor/activities", {
          method: "POST",
          body: JSON.stringify({ ...input, attachments }),
        })
        applyEventUpdate(data.activity)
        void broadcastActivityUpdated(data.activity.id)
        return { ok: true, event: data.activity }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyEventUpdate]
  )

  const updateEvent = React.useCallback(
    async (id: string, input: EventFormInput): Promise<ActionResult> => {
      try {
        const newAttachments = input.attachments.filter((a) => a.url.startsWith("blob:"))
        const alreadyUploaded = input.attachments.filter((a) => !a.url.startsWith("blob:"))
        const uploaded = await uploadAttachments(newAttachments)
        const data = await api<{ activity: CalendarEvent }>(`/api/atividades-setor/activities/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...input, attachments: [...alreadyUploaded, ...uploaded] }),
        })
        applyEventUpdate(data.activity)
        void broadcastActivityUpdated(data.activity.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyEventUpdate]
  )

  const deleteEvent = React.useCallback(
    async (id: string): Promise<ActionResult> => {
      try {
        const data = await api<{ activity: CalendarEvent }>(`/api/atividades-setor/activities/${id}/delete`, {
          method: "POST",
        })
        applyEventUpdate(data.activity)
        void broadcastActivityUpdated(data.activity.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [applyEventUpdate]
  )

  // -------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------

  const notificationsForCurrentUser = React.useMemo(
    () => [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications]
  )
  const unreadNotifications = React.useMemo(
    () => notificationsForCurrentUser.filter((n) => !n.read),
    [notificationsForCurrentUser]
  )
  const dismissNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    void api(`/api/atividades-setor/notifications/${id}/read`, { method: "POST" }).catch(() => {})
  }, [])

  const value = React.useMemo<ActivitiesContextValue>(
    () => ({
      currentUserId,
      currentUserSector,
      isSectorLeader,
      role,
      managedSectorsForCurrentUser,
      sectors,
      visibleTasks: tasks,
      visibleEvents: events,
      getTask,
      getEvent,
      getComments,
      loadComments,
      getChecklist,
      loadChecklist,
      addChecklistItem,
      toggleChecklistItem,
      deleteChecklistItem,
      getTaskHistory,
      loadTaskHistory,
      createTask,
      updateTask,
      changeTaskStatus,
      archiveTask,
      restoreTask,
      deleteTask,
      hardDeleteTask,
      duplicateTask,
      addComment,
      editComment,
      deleteComment,
      createEvent,
      updateEvent,
      deleteEvent,
      notificationsForCurrentUser,
      unreadNotifications,
      dismissNotification,
    }),
    [
      currentUserId,
      currentUserSector,
      isSectorLeader,
      role,
      managedSectorsForCurrentUser,
      sectors,
      tasks,
      events,
      getTask,
      getEvent,
      getComments,
      loadComments,
      getChecklist,
      loadChecklist,
      addChecklistItem,
      toggleChecklistItem,
      deleteChecklistItem,
      getTaskHistory,
      loadTaskHistory,
      createTask,
      updateTask,
      changeTaskStatus,
      archiveTask,
      restoreTask,
      deleteTask,
      hardDeleteTask,
      duplicateTask,
      addComment,
      editComment,
      deleteComment,
      createEvent,
      updateEvent,
      deleteEvent,
      notificationsForCurrentUser,
      unreadNotifications,
      dismissNotification,
    ]
  )

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>
}

export function useAtividadesSetor() {
  const ctx = React.useContext(ActivitiesContext)
  if (!ctx) {
    throw new Error("useAtividadesSetor must be used within an AtividadesSetorProvider")
  }
  return ctx
}
