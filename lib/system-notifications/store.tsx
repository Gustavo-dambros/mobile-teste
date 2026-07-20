"use client"

import * as React from "react"

export interface SystemNotification {
  id: string
  title: string
  description: string
  createdAt: string
  read: boolean
}

interface SystemNotificationsContextValue {
  notifications: SystemNotification[]
  unreadCount: number
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
}

const SystemNotificationsContext = React.createContext<SystemNotificationsContextValue | null>(null)

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

export function SystemNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<SystemNotification[]>([])

  const refresh = React.useCallback(async () => {
    try {
      const data = await api<{ notifications: SystemNotification[] }>("/api/system-notifications")
      setNotifications(data.notifications)
    } catch {
      // silent — poll retries
    }
  }, [])

  React.useEffect(() => {
    const initial = window.setTimeout(refresh, 0)
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [refresh])

  const markAllRead = React.useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api("/api/system-notifications/mark-read", { method: "POST" })
    } catch {
      // best-effort — a stale unread will just show up again on next refresh
    }
  }, [])

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const value = React.useMemo<SystemNotificationsContextValue>(
    () => ({ notifications, unreadCount, markAllRead, refresh }),
    [notifications, unreadCount, markAllRead, refresh]
  )

  return (
    <SystemNotificationsContext.Provider value={value}>
      {children}
    </SystemNotificationsContext.Provider>
  )
}

export function useSystemNotifications() {
  const ctx = React.useContext(SystemNotificationsContext)
  if (!ctx) {
    throw new Error("useSystemNotifications must be used within a SystemNotificationsProvider")
  }
  return ctx
}
