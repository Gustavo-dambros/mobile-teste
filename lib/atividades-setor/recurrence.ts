import type { RecurrenceRule } from "@/components/atividades-setor/types"

function addInterval(date: Date, rule: RecurrenceRule): Date {
  const next = new Date(date)
  switch (rule.freq) {
    case "diaria":
      next.setDate(next.getDate() + rule.interval)
      break
    case "semanal":
      next.setDate(next.getDate() + 7 * rule.interval)
      break
    case "mensal":
      next.setMonth(next.getMonth() + rule.interval)
      break
    case "anual":
      next.setFullYear(next.getFullYear() + rule.interval)
      break
  }
  return next
}

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Expands a recurrence rule into concrete occurrence dates ("YYYY-MM-DD")
 * that fall within [rangeStart, rangeEnd], anchored at `startDateISO`.
 * Covers the daily/weekly(+weekdays)/monthly/yearly cases the module's
 * forms expose today. The rule shape mirrors RFC 5545 / RRULE fields on
 * purpose, so a full engine can replace this function later without
 * touching callers or the stored data.
 *
 * Bounded by `until`, `count`, or a 2-year safety cap — whichever comes
 * first — so an unbounded rule can never generate an unbounded loop.
 */
export function expandOccurrences(
  startDateISO: string,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  const anchor = new Date(`${startDateISO}T00:00:00`)
  const until = rule.until ? new Date(`${rule.until}T23:59:59`) : null
  const hardStop = new Date(anchor)
  hardStop.setFullYear(hardStop.getFullYear() + 2)
  const stopAt = until && until < hardStop ? until : hardStop
  const maxEmitted = rule.count ?? 500

  const occurrences: string[] = []
  let emitted = 0

  if (rule.freq === "semanal" && rule.byWeekday && rule.byWeekday.length > 0) {
    const weekdays = [...rule.byWeekday].sort((a, b) => a - b)
    const cursor = new Date(anchor)
    cursor.setDate(cursor.getDate() - cursor.getDay())
    while (cursor <= stopAt && emitted < maxEmitted) {
      for (const weekday of weekdays) {
        if (emitted >= maxEmitted) break
        const day = new Date(cursor)
        day.setDate(day.getDate() + weekday)
        if (day < anchor || day > stopAt) continue
        emitted++
        if (day >= rangeStart && day <= rangeEnd) occurrences.push(toISODate(day))
      }
      cursor.setDate(cursor.getDate() + 7 * rule.interval)
    }
    return occurrences
  }

  let current = new Date(anchor)
  while (current <= stopAt && emitted < maxEmitted) {
    emitted++
    if (current >= rangeStart && current <= rangeEnd) occurrences.push(toISODate(current))
    current = addInterval(current, rule)
  }
  return occurrences
}
