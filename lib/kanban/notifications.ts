import type { KanbanCard, KanbanNotificationType } from "@/components/kanban/types"
import { REMINDER_OFFSET_MINUTES } from "@/lib/kanban/constants"

/** Absolute instant the reminder should fire, or null when the card has no due date/reminder. */
export function computeReminderAt(
  card: Pick<KanbanCard, "dueAt" | "reminderType" | "reminderCustomMinutes">
): string | null {
  if (!card.dueAt || !card.reminderType) return null
  const offsetMinutes =
    card.reminderType === "personalizado"
      ? (card.reminderCustomMinutes ?? 0)
      : (REMINDER_OFFSET_MINUTES[card.reminderType] ?? 0)
  return new Date(new Date(card.dueAt).getTime() - offsetMinutes * 60_000).toISOString()
}

export function isOverdue(card: Pick<KanbanCard, "dueAt" | "completedAt">): boolean {
  return !!card.dueAt && !card.completedAt && new Date(card.dueAt).getTime() < Date.now()
}

export function isDueSoon(
  card: Pick<KanbanCard, "dueAt" | "completedAt">,
  windowHours = 24
): boolean {
  if (!card.dueAt || card.completedAt) return false
  const diffMs = new Date(card.dueAt).getTime() - Date.now()
  return diffMs >= 0 && diffMs <= windowHours * 3_600_000
}

/**
 * Idempotency key for a scheduled reminder — same card + type + instant never
 * produces two notifications, even if the scheduler tick re-evaluates it.
 */
export function notificationDedupeKey(
  cardId: string,
  type: KanbanNotificationType,
  scheduledAt: string
): string {
  return `${cardId}:${type}:${scheduledAt}`
}
