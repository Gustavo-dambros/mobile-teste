import type { CalendarEvent, Task } from "@/components/atividades-setor/types"
import { getCalendarColor } from "@/lib/atividades-setor/colors"
import { expandOccurrences } from "@/lib/atividades-setor/recurrence"

export interface CalendarItem {
  /** Unique per rendered occurrence (differs from refId for recurring items). */
  id: string
  kind: "event"
  refId: string
  date: string
  time?: string
  endTime?: string
  allDay: boolean
  title: string
  color: string
  responsibleId: string
  /** Checklist progress across the activity's tasks — undefined when it has none yet. */
  taskProgress?: { done: number; total: number }
}

/**
 * Builds the single combined list the month/week/day/list views all read
 * from — every activity, recurrence already expanded to concrete occurrence
 * dates within [rangeStart, rangeEnd]. Tasks never get their own chip: they
 * only exist as checklist items/kanban cards inside their activity, so they
 * never surface here — only rolled up into `taskProgress`.
 */
export function buildCalendarItems(
  events: CalendarEvent[],
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarItem[] {
  const items: CalendarItem[] = []

  function progressFor(eventId: string): CalendarItem["taskProgress"] {
    const own = tasks.filter((t) => t.eventId === eventId && !t.deletedAt && !t.archivedAt)
    if (own.length === 0) return undefined
    return { done: own.filter((t) => t.status === "concluida").length, total: own.length }
  }

  for (const event of events) {
    if (event.deletedAt) continue
    const color = event.color ?? getCalendarColor(event.creatorId)
    const taskProgress = progressFor(event.id)
    if (event.recurrence) {
      const dates = expandOccurrences(event.date, event.recurrence, rangeStart, rangeEnd)
      for (const date of dates) {
        items.push({
          id: `event-${event.id}-${date}`,
          kind: "event",
          refId: event.id,
          date,
          time: event.startTime,
          endTime: event.endTime,
          allDay: event.allDay,
          title: event.title,
          color,
          responsibleId: event.creatorId,
          taskProgress,
        })
      }
    } else {
      const date = new Date(`${event.date}T00:00:00`)
      if (date >= rangeStart && date <= rangeEnd) {
        items.push({
          id: `event-${event.id}`,
          kind: "event",
          refId: event.id,
          date: event.date,
          time: event.startTime,
          endTime: event.endTime,
          allDay: event.allDay,
          title: event.title,
          color,
          responsibleId: event.creatorId,
          taskProgress,
        })
      }
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
}
