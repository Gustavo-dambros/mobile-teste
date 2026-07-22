"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, BellIcon } from "lucide-react"

import { useSystemNotifications } from "@/lib/system-notifications/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function NotificacoesMobilePage() {
  const router = useRouter()
  const { notifications, markAllRead } = useSystemNotifications()

  React.useEffect(() => {
    const timeout = window.setTimeout(markAllRead, 0)
    return () => window.clearTimeout(timeout)
  }, [markAllRead])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-15 items-center gap-3 border-b border-border px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 text-base font-semibold">Notificações</h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto pb-24">
        {notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <BellIcon className="size-8" />
            <p className="text-sm">Nenhuma atualização por enquanto.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-4">
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
        )}
      </div>
    </div>
  )
}
