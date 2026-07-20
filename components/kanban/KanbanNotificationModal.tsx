"use client"

import { useRouter } from "next/navigation"
import { CalendarClockIcon, CheckCircle2Icon, ClockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/tickets/format"
import { PRIORITY_CONFIG } from "@/lib/kanban/constants"
import { useKanban } from "@/lib/kanban/store"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/**
 * Rendered once, globally (see app/(app)/layout.tsx). Pops up automatically
 * when a due-date reminder for the current user crosses its scheduled
 * instant, on whichever page they're on — one at a time, oldest first, and
 * never reappears once closed/read.
 */
export function KanbanNotificationModal() {
  const router = useRouter()
  const {
    nextPopupNotification,
    getCard,
    getBoard,
    columnsForBoard,
    markNotificationRead,
    snoozeNotification,
    completeFromNotification,
  } = useKanban()

  const notification = nextPopupNotification
  const card = notification ? getCard(notification.cardId) : undefined
  const board = notification ? getBoard(notification.boardId) : undefined
  const column = card ? columnsForBoard(card.boardId).find((c) => c.id === card.columnId) : undefined

  function handleClose() {
    if (notification) markNotificationRead(notification.id)
  }

  function handleView() {
    if (!notification || !card) return
    markNotificationRead(notification.id)
    router.push(`/kanban?board=${notification.boardId}&card=${notification.cardId}`)
  }

  function handleSnooze(minutes: number) {
    if (!notification) return
    snoozeNotification(notification.id, minutes)
  }

  function handleComplete() {
    if (!notification) return
    completeFromNotification(notification.id, notification.cardId)
  }

  return (
    <Dialog open={!!notification && !!card} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        {notification && card && (
          <>
            <DialogHeader>
              <Badge variant="outline" className="w-fit gap-1">
                <CalendarClockIcon className="size-3" />
                Você possui uma atividade próxima do prazo
              </Badge>
              <DialogTitle>{card.title}</DialogTitle>
              <DialogDescription>
                {board?.title}
                {column && ` · ${column.title}`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5 text-sm">
              {card.dueAt && (
                <div className="flex items-center gap-2">
                  <ClockIcon className="size-4 text-muted-foreground" />
                  <span>{formatDateTime(card.dueAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", PRIORITY_CONFIG[card.priority].dotClassName)} />
                <span>Prioridade {PRIORITY_CONFIG[card.priority].label}</span>
              </div>
            </div>
            <DialogFooter className="flex-wrap">
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>Lembrar depois</DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSnooze(10)}>10 minutos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnooze(30)}>30 minutos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnooze(60)}>1 hora</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnooze(24 * 60)}>Amanhã</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={handleComplete}>
                <CheckCircle2Icon data-icon="inline-start" />
                Marcar como concluída
              </Button>
              <Button onClick={handleView}>Ver atividade</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
