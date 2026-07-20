"use client"

import { BellIcon } from "lucide-react"

import { formatDateTime } from "@/lib/tickets/format"
import { notificationMessage } from "@/lib/announcements/notification-text"
import { useAnnouncements } from "@/lib/announcements/store"
import { EmptyNotificationsState } from "@/components/announcements/StateViews"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

export function AnnouncementNotificationBell() {
  const {
    notificationsForCurrentUser,
    unreadNotificationsForCurrentUser,
    dismissNotification,
    openDetail,
    getAnnouncement,
  } = useAnnouncements()

  const unreadCount = unreadNotificationsForCurrentUser.length

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="icon" className="relative" />}
      >
        <BellIcon />
        <span className="sr-only">Notificações</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1.5 -right-1.5 size-4 rounded-full px-1 tabular-nums"
          >
            {unreadCount}
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
            notificationsForCurrentUser.map((n) => {
              const announcement = getAnnouncement(n.announcementId)
              if (!announcement) return null
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    dismissNotification(n.id)
                    openDetail(announcement.id)
                  }}
                  className="flex flex-col gap-0.5 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <span className={n.read ? "text-sm text-muted-foreground" : "text-sm"}>
                      {notificationMessage(n.kind, announcement)}
                    </span>
                  </div>
                  <span className="pl-3.5 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
