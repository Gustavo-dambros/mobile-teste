"use client"

import * as React from "react"
import { BellIcon } from "lucide-react"

import { useSystemNotifications } from "@/lib/system-notifications/store"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SystemNotificationsPage() {
  const { notifications, markAllRead } = useSystemNotifications()

  React.useEffect(() => {
    const timeout = window.setTimeout(markAllRead, 0)
    return () => window.clearTimeout(timeout)
  }, [markAllRead])

  if (notifications.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <BellIcon className="size-8" />
        <p className="text-sm">Nenhuma atualização por enquanto.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 md:p-6">
      {notifications.map((n) => (
        <Card key={n.id}>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle className="text-base">{n.title}</CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              {!n.read && (
                <Badge variant="destructive" className="px-1.5">
                  Novo
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{n.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
