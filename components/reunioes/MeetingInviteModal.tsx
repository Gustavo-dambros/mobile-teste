"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarIcon, LockIcon, UserIcon, VideoIcon } from "lucide-react"

import { useReunioes } from "@/lib/reunioes/store"
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
 * Rendered once, globally (see app/(app)/layout.tsx) — mirrors
 * components/announcements/NotificationCenterModal.tsx. Pops up for meeting invites the
 * current user hasn't responded to yet, one at a time, oldest first. "Fechar" hides it for
 * this session only (stays unread, still counted in the sidebar badge, reappears later) —
 * everything else (Aceitar/Recusar/Ver detalhes) marks it read for good.
 */
export function MeetingInviteModal() {
  const router = useRouter()
  const {
    inviteNotifications,
    snoozedInviteNotificationIds,
    snoozeInviteNotification,
    viewInviteNotification,
    respondToInvite,
    getMeeting,
  } = useReunioes()

  const next = inviteNotifications.find((n) => !snoozedInviteNotificationIds.has(n.id))
  const meeting = next ? getMeeting(next.meetingId) : undefined

  function handleClose() {
    if (next) snoozeInviteNotification(next.id)
  }

  function handleView() {
    if (!next || !meeting) return
    viewInviteNotification(next.id)
    router.push(`/reunioes/${meeting.id}`)
  }

  async function handleRespond(status: "accepted" | "declined") {
    if (!next || !meeting) return
    const meetingId = meeting.id
    const result = await respondToInvite(next.id, status)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível responder ao convite")
      return
    }
    if (status === "declined") {
      toast.success("Convite recusado")
      return
    }
    // Accepting a meeting that's already happening should actually take you
    // there — otherwise "Aceitar" has no visible effect for the person clicking it.
    toast.success("Convite aceito")
    router.push(`/reunioes/${meetingId}`)
  }

  return (
    <Dialog open={!!next && !!meeting} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        {meeting && (
          <>
            <DialogHeader>
              <Badge variant="default" className="w-fit">
                <VideoIcon data-icon="inline-start" />
                Convite para reunião
              </Badge>
              <DialogTitle>{meeting.title}</DialogTitle>
              <DialogDescription>
                {meeting.hostName} te convidou para uma reunião{meeting.hasPassword ? " protegida por senha" : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span>
                  {meeting.scheduledFor
                    ? new Date(meeting.scheduledFor).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "A qualquer momento"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="size-4 text-muted-foreground" />
                <span>Anfitrião: {meeting.hostName}</span>
              </div>
              {meeting.hasPassword && (
                <div className="flex items-center gap-2">
                  <LockIcon className="size-4 text-muted-foreground" />
                  <span>Requer senha de acesso</span>
                </div>
              )}
            </div>
            <DialogFooter className="flex-wrap">
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button variant="outline" onClick={() => handleRespond("declined")}>
                Recusar
              </Button>
              <Button variant="secondary" onClick={() => handleRespond("accepted")}>
                Aceitar
              </Button>
              <Button onClick={handleView}>Ver detalhes</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
