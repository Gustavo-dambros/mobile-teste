/**
 * America/Sao_Paulo has been a fixed UTC-3 offset since Brazil abolished DST
 * in 2019 — no seasonal shift to account for, so a constant offset is exact.
 */
const SAO_PAULO_OFFSET_HOURS = 3

/** Interprets a "YYYY-MM-DD" + "HH:mm" pair as America/Sao_Paulo wall-clock time. */
export function saoPauloDateTimeToUTC(dateISO: string, time: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh + SAO_PAULO_OFFSET_HOURS, mm, 0))
}

export interface ScheduledTrigger {
  kind: "reminder-1d" | "reminder-day-of"
  triggerAt: Date
}

/**
 * Computes which reminders still apply for an announcement created at
 * `createdAt`. A reminder is skipped entirely (not just delayed) if its
 * trigger moment already lies in the past relative to creation — this is
 * what keeps a same-day, post-06:00 event from sending retroactive
 * "day before" / "06:00" reminders, per the spec.
 */
export function computeApplicableTriggers(
  dateISO: string,
  time: string,
  createdAt: string
): ScheduledTrigger[] {
  const eventAt = saoPauloDateTimeToUTC(dateISO, time)
  const createdAtMs = new Date(createdAt).getTime()

  const dayOf = saoPauloDateTimeToUTC(dateISO, "06:00")
  const oneDayBefore = new Date(eventAt.getTime() - 24 * 60 * 60 * 1000)

  const triggers: ScheduledTrigger[] = []
  if (oneDayBefore.getTime() >= createdAtMs) {
    triggers.push({ kind: "reminder-1d", triggerAt: oneDayBefore })
  }
  if (dayOf.getTime() >= createdAtMs) {
    triggers.push({ kind: "reminder-day-of", triggerAt: dayOf })
  }
  return triggers
}
