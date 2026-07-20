"use client"

import * as React from "react"
import { toast } from "sonner"
import { BellIcon, CalendarClockIcon, CheckCircle2Icon, ClockIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { formatDateTime } from "@/lib/tickets/format"
import { PRIORITY_CONFIG } from "@/lib/kanban/constants"
import { isOverdue } from "@/lib/kanban/notifications"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard, KanbanNotification } from "@/components/kanban/types"
import { EmptyNotificationsState } from "@/components/kanban/StateViews"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString()
}

function isWithinNextDays(iso: string, days: number) {
  const diffMs = new Date(iso).getTime() - Date.now()
  return diffMs > 0 && diffMs <= days * 86_400_000
}

function CardRow({
  card,
  onOpen,
  onComplete,
  tone,
}: {
  card: KanbanCard
  onOpen: () => void
  onComplete: () => void
  tone: "overdue" | "today" | "upcoming"
}) {
  const priorityConfig = PRIORITY_CONFIG[card.priority]
  return (
    <div className="flex items-start gap-2 rounded-lg p-2 hover:bg-muted/60">
      <span
        className={
          tone === "overdue"
            ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive"
            : tone === "today"
              ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500"
              : "mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground"
        }
        aria-hidden
      />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm">{card.title}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className={priorityConfig.className}>{priorityConfig.label}</span>
          {card.dueAt && <span>· {formatDateTime(card.dueAt)}</span>}
        </p>
      </button>
      <Button type="button" variant="ghost" size="icon-xs" onClick={onComplete} aria-label={`Concluir ${card.title}`}>
        <CheckCircle2Icon />
      </Button>
    </div>
  )
}

function NotificationRow({
  notification,
  card,
  onOpen,
}: {
  notification: KanbanNotification
  card: KanbanCard | undefined
  onOpen: () => void
}) {
  const { markNotificationRead, snoozeNotification, removeNotification } = useKanban()
  return (
    <div className="flex items-start gap-2 rounded-lg p-2 hover:bg-muted/60">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm">{card?.title ?? notification.message}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(notification.scheduledAt)}</p>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        {!notification.readAt && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
              <ClockIcon />
              <span className="sr-only">Adiar lembrete</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 10)}>10 minutos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 30)}>30 minutos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 60)}>1 hora</DropdownMenuItem>
              <DropdownMenuItem onClick={() => snoozeNotification(notification.id, 24 * 60)}>Amanhã</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!notification.readAt && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => markNotificationRead(notification.id)}
            aria-label="Marcar como lida"
          >
            <CheckCircle2Icon />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => removeNotification(notification.id)}
          aria-label="Remover notificação"
        >
          <XIcon />
        </Button>
      </div>
    </div>
  )
}

export function KanbanNotifications({ onOpenCard }: { onOpenCard: (boardId: string, cardId: string) => void }) {
  const { boardsForUser, columnsForBoard, cardsForColumn, notificationsForUser, unreadCount, markAllNotificationsRead, completeCard } =
    useKanban()

  const allCards = React.useMemo(() => {
    const cards: KanbanCard[] = []
    boardsForUser.forEach((board) => {
      columnsForBoard(board.id).forEach((column) => {
        cards.push(...cardsForColumn(column.id))
      })
    })
    return cards
  }, [boardsForUser, columnsForBoard, cardsForColumn])

  const overdueCards = allCards.filter((c) => isOverdue(c))
  const todayCards = allCards.filter((c) => c.dueAt && !c.completedAt && isToday(c.dueAt) && !isOverdue(c))
  const upcomingCards = allCards.filter(
    (c) => c.dueAt && !c.completedAt && !isOverdue(c) && !isToday(c.dueAt) && isWithinNextDays(c.dueAt, 7)
  )
  // snoozedUntil is cleared by the store's scheduler once it elapses, so a
  // plain truthiness check reflects "still snoozed" without touching Date.now().
  const snoozed = notificationsForUser.filter((n) => n.snoozedUntil)
  const readHistory = notificationsForUser.filter((n) => n.readAt).slice(0, 12)

  const cardsById = new Map(allCards.map((c) => [c.id, c]))
  const isEmpty =
    overdueCards.length === 0 &&
    todayCards.length === 0 &&
    upcomingCards.length === 0 &&
    snoozed.length === 0 &&
    readHistory.length === 0

  async function handleComplete(card: KanbanCard) {
    const result = await completeCard(card.id)
    if (result.ok) toast.success("Atividade concluída")
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="relative" />}>
        <BellIcon />
        <span className="sr-only">Notificações do Kanban</span>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 size-4 rounded-full px-1 tabular-nums">
            {unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-2.5 pb-1.5">
          <PopoverHeader className="p-0">
            <PopoverTitle>Notificações</PopoverTitle>
          </PopoverHeader>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={markAllNotificationsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="flex max-h-96 flex-col gap-1 overflow-y-auto p-1.5 pt-0.5">
          {isEmpty && <EmptyNotificationsState />}

          {overdueCards.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="flex items-center gap-1 px-2 pt-1.5 text-xs font-medium text-destructive">
                <TriangleAlertIcon className="size-3" />
                Atividades vencidas
              </p>
              {overdueCards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  tone="overdue"
                  onOpen={() => onOpenCard(card.boardId, card.id)}
                  onComplete={() => handleComplete(card)}
                />
              ))}
            </div>
          )}

          {todayCards.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="px-2 pt-1.5 text-xs font-medium text-muted-foreground">Para hoje</p>
              {todayCards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  tone="today"
                  onOpen={() => onOpenCard(card.boardId, card.id)}
                  onComplete={() => handleComplete(card)}
                />
              ))}
            </div>
          )}

          {upcomingCards.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="px-2 pt-1.5 text-xs font-medium text-muted-foreground">Próximas</p>
              {upcomingCards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  tone="upcoming"
                  onOpen={() => onOpenCard(card.boardId, card.id)}
                  onComplete={() => handleComplete(card)}
                />
              ))}
            </div>
          )}

          {snoozed.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <Separator className="my-1" />
              <p className="flex items-center gap-1 px-2 text-xs font-medium text-muted-foreground">
                <CalendarClockIcon className="size-3" />
                Lembretes adiados
              </p>
              {snoozed.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  card={cardsById.get(n.cardId)}
                  onOpen={() => onOpenCard(n.boardId, n.cardId)}
                />
              ))}
            </div>
          )}

          {readHistory.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <Separator className="my-1" />
              <p className="px-2 text-xs font-medium text-muted-foreground">Já visualizadas</p>
              {readHistory.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  card={cardsById.get(n.cardId)}
                  onOpen={() => onOpenCard(n.boardId, n.cardId)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
