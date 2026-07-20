"use client"

import * as React from "react"

import { useCurrentUser } from "@/lib/current-user/context"
import { notificationHeadline, notificationMessage } from "@/lib/announcements/notification-text"
import { notifyBrowser } from "@/lib/notifications/browser-notifications"
import type {
  Announcement,
  AnnouncementHistoryEvent,
  AnnouncementNotification,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "@/components/announcements/types"

export interface ActionResult {
  ok: boolean
  error?: string
}

const POLL_INTERVAL_MS = 60_000

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
  return data as T
}

interface AnnouncementsContextValue {
  visibleAnnouncements: Announcement[]
  getAnnouncement: (id: string) => Announcement | undefined
  canManage: (announcement: Announcement) => boolean
  isRecipient: (announcement: Announcement) => boolean
  isViewed: (id: string) => boolean
  createAnnouncement: (input: CreateAnnouncementInput) => Promise<ActionResult & { announcement?: Announcement }>
  updateAnnouncement: (id: string, input: UpdateAnnouncementInput) => Promise<ActionResult>
  deleteAnnouncement: (id: string) => Promise<ActionResult>
  markViewed: (id: string) => void
  getHistory: (announcementId: string) => AnnouncementHistoryEvent[]

  notificationsForCurrentUser: AnnouncementNotification[]
  unreadNotificationsForCurrentUser: AnnouncementNotification[]
  dismissNotification: (id: string) => void
  sidebarUnreadCount: number

  isFormDialogOpen: boolean
  formMode: "create" | "edit"
  formInitialDate: string | null
  editingAnnouncementId: string | null
  openCreateDialog: (initialDate?: string) => void
  openEditDialog: (id: string) => void
  closeFormDialog: () => void

  detailAnnouncementId: string | null
  openDetail: (id: string) => void
  closeDetail: () => void

  deletingAnnouncementId: string | null
  openDeleteConfirm: (id: string) => void
  closeDeleteConfirm: () => void
}

const AnnouncementsContext = React.createContext<AnnouncementsContextValue | null>(null)

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser()
  const currentUserId = currentUser?.id ?? ""

  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [history, setHistory] = React.useState<AnnouncementHistoryEvent[]>([])
  const [notifications, setNotifications] = React.useState<AnnouncementNotification[]>([])
  const [viewedAt, setViewedAt] = React.useState<Record<string, string>>({})

  // Seeded on the first successful poll so pre-existing unread notifications
  // don't fire an OS notification on load — only genuinely new ones after
  // that, same pattern as the known-id refs in chat/tickets stores.
  const knownNotificationIdsRef = React.useRef<Set<string> | null>(null)

  const refreshAll = React.useCallback(async () => {
    try {
      const data = await api<{
        announcements: Announcement[]
        history: AnnouncementHistoryEvent[]
        notifications: AnnouncementNotification[]
        viewedAt: Record<string, string>
      }>("/api/announcements")
      if (knownNotificationIdsRef.current) {
        for (const n of data.notifications) {
          if (n.read || knownNotificationIdsRef.current.has(n.id)) continue
          const announcement = data.announcements.find((a) => a.id === n.announcementId)
          if (announcement) {
            notifyBrowser(notificationHeadline(n.kind), notificationMessage(n.kind, announcement), {
              tag: `announcement-${n.id}`,
            })
          }
        }
      }
      knownNotificationIdsRef.current = new Set(data.notifications.map((n) => n.id))
      setAnnouncements(data.announcements)
      setHistory(data.history)
      setNotifications(data.notifications)
      setViewedAt(data.viewedAt)
    } catch {
      // silent — poll retries
    }
  }, [])

  React.useEffect(() => {
    async function checkSchedule() {
      try {
        await api("/api/announcements/notifications/sync", { method: "POST" })
      } catch {
        // silent — poll retries
      }
      refreshAll()
    }
    checkSchedule()
    const interval = window.setInterval(checkSchedule, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [refreshAll])

  const getAnnouncement = React.useCallback(
    (id: string) => announcements.find((a) => a.id === id),
    [announcements]
  )

  const visibleAnnouncements = announcements

  const canManage = React.useCallback(
    (announcement: Announcement) => announcement.creatorId === currentUserId,
    [currentUserId]
  )

  const isRecipient = React.useCallback(
    (announcement: Announcement) => announcement.recipientUserIds.includes(currentUserId),
    [currentUserId]
  )

  const isViewed = React.useCallback((id: string) => !!viewedAt[id], [viewedAt])

  const getHistory = React.useCallback(
    (announcementId: string) =>
      history
        .filter((h) => h.announcementId === announcementId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [history]
  )

  const createAnnouncement = React.useCallback(
    async (input: CreateAnnouncementInput): Promise<ActionResult & { announcement?: Announcement }> => {
      try {
        const data = await api<{ announcement: Announcement }>("/api/announcements", {
          method: "POST",
          body: JSON.stringify(input),
        })
        setAnnouncements((prev) => [data.announcement, ...prev])
        return { ok: true, announcement: data.announcement }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const updateAnnouncement = React.useCallback(
    async (id: string, input: UpdateAnnouncementInput): Promise<ActionResult> => {
      try {
        const data = await api<{ announcement: Announcement }>(`/api/announcements/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        })
        setAnnouncements((prev) => prev.map((a) => (a.id === id ? data.announcement : a)))
        refreshAll()
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [refreshAll]
  )

  const deleteAnnouncement = React.useCallback(async (id: string): Promise<ActionResult> => {
    try {
      await api(`/api/announcements/${id}`, { method: "DELETE" })
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
      setNotifications((prev) => prev.filter((n) => n.announcementId !== id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const markViewed = React.useCallback((id: string) => {
    const now = new Date().toISOString()
    setViewedAt((prev) => ({ ...prev, [id]: now }))
    setNotifications((prev) =>
      prev.map((n) => (n.announcementId === id && !n.read ? { ...n, read: true } : n))
    )
    api(`/api/announcements/${id}/view`, { method: "POST" }).catch(() => {
      // best-effort — next poll reconciles
    })
  }, [])

  const dismissNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    api(`/api/announcements/notifications/${id}/read`, { method: "POST" }).catch(() => {
      // best-effort — next poll reconciles
    })
  }, [])

  const notificationsForCurrentUser = React.useMemo(
    () => [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications]
  )

  const unreadNotificationsForCurrentUser = React.useMemo(
    () =>
      notificationsForCurrentUser
        .filter((n) => !n.read)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [notificationsForCurrentUser]
  )

  const sidebarUnreadCount = React.useMemo(
    () => visibleAnnouncements.filter((a) => !viewedAt[a.id]).length,
    [visibleAnnouncements, viewedAt]
  )

  // ---------------------------------------------------------------------
  // Dialog / detail UI state
  // ---------------------------------------------------------------------
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")
  const [formInitialDate, setFormInitialDate] = React.useState<string | null>(null)
  const [editingAnnouncementId, setEditingAnnouncementId] = React.useState<string | null>(null)
  const [detailAnnouncementId, setDetailAnnouncementId] = React.useState<string | null>(null)
  const [deletingAnnouncementId, setDeletingAnnouncementId] = React.useState<string | null>(null)

  const openCreateDialog = React.useCallback((initialDate?: string) => {
    setFormMode("create")
    setEditingAnnouncementId(null)
    setFormInitialDate(initialDate ?? null)
    setIsFormDialogOpen(true)
  }, [])

  const openEditDialog = React.useCallback((id: string) => {
    setFormMode("edit")
    setEditingAnnouncementId(id)
    setFormInitialDate(null)
    setIsFormDialogOpen(true)
  }, [])

  const closeFormDialog = React.useCallback(() => setIsFormDialogOpen(false), [])

  const openDetail = React.useCallback((id: string) => setDetailAnnouncementId(id), [])
  const closeDetail = React.useCallback(() => setDetailAnnouncementId(null), [])

  const openDeleteConfirm = React.useCallback((id: string) => setDeletingAnnouncementId(id), [])
  const closeDeleteConfirm = React.useCallback(() => setDeletingAnnouncementId(null), [])

  const value = React.useMemo<AnnouncementsContextValue>(
    () => ({
      visibleAnnouncements,
      getAnnouncement,
      canManage,
      isRecipient,
      isViewed,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      markViewed,
      getHistory,
      notificationsForCurrentUser,
      unreadNotificationsForCurrentUser,
      dismissNotification,
      sidebarUnreadCount,
      isFormDialogOpen,
      formMode,
      formInitialDate,
      editingAnnouncementId,
      openCreateDialog,
      openEditDialog,
      closeFormDialog,
      detailAnnouncementId,
      openDetail,
      closeDetail,
      deletingAnnouncementId,
      openDeleteConfirm,
      closeDeleteConfirm,
    }),
    [
      visibleAnnouncements,
      getAnnouncement,
      canManage,
      isRecipient,
      isViewed,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      markViewed,
      getHistory,
      notificationsForCurrentUser,
      unreadNotificationsForCurrentUser,
      dismissNotification,
      sidebarUnreadCount,
      isFormDialogOpen,
      formMode,
      formInitialDate,
      editingAnnouncementId,
      openCreateDialog,
      openEditDialog,
      closeFormDialog,
      detailAnnouncementId,
      openDetail,
      closeDetail,
      deletingAnnouncementId,
      openDeleteConfirm,
      closeDeleteConfirm,
    ]
  )

  return (
    <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>
  )
}

export function useAnnouncements() {
  const ctx = React.useContext(AnnouncementsContext)
  if (!ctx) {
    throw new Error("useAnnouncements must be used within an AnnouncementsProvider")
  }
  return ctx
}

export { POLL_INTERVAL_MS }
