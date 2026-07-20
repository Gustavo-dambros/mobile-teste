"use client"

import { useRouter } from "next/navigation"
import { CalendarIcon, ClockIcon, MegaphoneIcon, PresentationIcon, UserIcon } from "lucide-react"

import { notificationMessage } from "@/lib/announcements/notification-text"
import { useAnnouncements } from "@/lib/announcements/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Rendered once, globally (see app/(app)/layout.tsx). Pops up automatically
 * whenever a new notification (publish, update, or scheduled reminder)
 * arrives for the current user, on whichever page they're on — one at a
 * time, oldest first, and never reappears once closed.
 */
export function NotificationCenterModal() {
  const router = useRouter()
  const { unreadNotificationsForCurrentUser, dismissNotification, getAnnouncement, openDetail } =
    useAnnouncements()

  const next = unreadNotificationsForCurrentUser[0]
  const announcement = next ? getAnnouncement(next.announcementId) : undefined

  function handleClose() {
    if (next) dismissNotification(next.id)
  }

  function handleView() {
    if (!next || !announcement) return
    dismissNotification(next.id)
    openDetail(announcement.id)
    router.push("/anuncios-eventos")
  }

  return (
    <Dialog
      open={!!next && !!announcement}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DialogContent className="sm:max-w-sm">
        {announcement && (
          <>
            <DialogHeader>
              <Badge
                variant={announcement.type === "Evento" ? "default" : "secondary"}
                className="w-fit"
              >
                {announcement.type === "Evento" ? (
                  <PresentationIcon data-icon="inline-start" />
                ) : (
                  <MegaphoneIcon data-icon="inline-start" />
                )}
                {announcement.type}
              </Badge>
              <DialogTitle>{announcement.title}</DialogTitle>
              <DialogDescription>
                {next && notificationMessage(next.kind, announcement)}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span>
                  {new Date(`${announcement.date}T00:00:00`).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" />
                <span>{announcement.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="size-4 text-muted-foreground" />
                <span>Responsável: {announcement.responsibleName}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={handleView}>
                {announcement.type === "Evento" ? "Ver evento" : "Ver anúncio"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
