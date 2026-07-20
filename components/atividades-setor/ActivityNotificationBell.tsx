"use client"

import { BellIcon } from "lucide-react"

import { formatDateTime } from "@/lib/tickets/format"
import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import { EmptyNotificationsState } from "@/components/atividades-setor/StateViews"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

export function ActivityNotificationBell({
  onOpenTask,
  onOpenEvent,
}: {
  onOpenTask: (id: string) => void
  onOpenEvent: (id: string) => void
}) {
  const { notificationsForCurrentUser, unreadNotifications, dismissNotification } =
    useAtividadesSetor()

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="relative" />}>
        <BellIcon />
        <span className="sr-only">Notificações</span>
        {unreadNotifications.length > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1.5 -right-1.5 size-4 rounded-full px-1 tabular-nums"
          >
            {unreadNotifications.length}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <PopoverHeader className="p-2.5 pb-0">
          <PopoverTitle>Notificações</PopoverTitle>
        </PopoverHeader>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto p-2.5 pt-2">
          {notificationsForCurrentUser.length === 0 ? (
            <EmptyNotificationsState />
          ) : (
            notificationsForCurrentUser.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  dismissNotification(n.id)
                  if (n.relatedType === "task") onOpenTask(n.relatedId)
                  else onOpenEvent(n.relatedId)
                }}
                className="flex flex-col gap-0.5 rounded-lg p-2 text-left transition-colors hover:bg-muted"
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className={n.read ? "text-sm text-muted-foreground" : "text-sm"}>
                    {n.message}
                  </span>
                </div>
                <span className="pl-3.5 text-xs text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
