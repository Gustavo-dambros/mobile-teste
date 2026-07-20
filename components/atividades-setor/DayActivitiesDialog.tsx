"use client"

import { PlusIcon } from "lucide-react"

import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import type { CalendarEvent } from "@/components/atividades-setor/types"
import { EmptyState } from "@/components/atividades-setor/StateViews"
import { UserAvatarBadge } from "@/components/atividades-setor/UserAvatarBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatDayLabel(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
}

/**
 * Central dialog opened by clicking a day on the calendar — lists that
 * day's activities and offers creating a new one, before drilling into any
 * single activity's own page.
 */
export function DayActivitiesDialog({
  dateISO,
  onOpenChange,
  onSelectActivity,
  onCreateActivity,
}: {
  dateISO: string | null
  onOpenChange: (open: boolean) => void
  onSelectActivity: (event: CalendarEvent) => void
  onCreateActivity: () => void
}) {
  const { visibleEvents, visibleTasks } = useAtividadesSetor()

  const dayEvents = dateISO
    ? visibleEvents
        .filter((e) => !e.deletedAt && e.date === dateISO)
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
    : []

  return (
    <Dialog open={!!dateISO} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{dateISO ? formatDayLabel(dateISO) : ""}</DialogTitle>
          <DialogDescription>
            {dayEvents.length === 0
              ? "Nenhuma atividade neste dia."
              : `${dayEvents.length} ${dayEvents.length === 1 ? "atividade" : "atividades"} neste dia.`}
          </DialogDescription>
        </DialogHeader>

        {dayEvents.length === 0 ? (
          <EmptyState
            title="Nenhuma atividade"
            description="Crie a primeira atividade deste dia."
          />
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {dayEvents.map((event) => {
              const tasks = visibleTasks.filter(
                (t) => t.eventId === event.id && !t.deletedAt && !t.archivedAt
              )
              const done = tasks.filter((t) => t.status === "concluida").length
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectActivity(event)}
                  className="flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{event.title}</span>
                    {event.allDay ? (
                      <Badge variant="outline">Dia inteiro</Badge>
                    ) : (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {event.startTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex -space-x-1.5">
                      {event.participantIds.slice(0, 4).map((id) => (
                        <UserAvatarBadge key={id} userId={id} size="sm" />
                      ))}
                    </div>
                    {tasks.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {done}/{tasks.length} tarefas
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <Button onClick={onCreateActivity}>
          <PlusIcon data-icon="inline-start" />
          Criar atividade
        </Button>
      </DialogContent>
    </Dialog>
  )
}
