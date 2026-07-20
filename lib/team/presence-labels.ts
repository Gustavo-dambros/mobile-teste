export const PRESENCE_LABEL: Record<string, string> = {
  ONLINE: "Online",
  BUSY: "Ocupado",
  AWAY: "Ausente",
  OFFLINE: "Offline",
}

/**
 * Grace window after the last heartbeat before someone is considered
 * offline. Deliberately generous (not just "one missed 30s beat"): being
 * logged in counts as online even while the tab sits unfocused in the
 * background (another window, another app) — browsers throttle JS timers
 * in backgrounded tabs down to roughly one tick a minute, so a tight
 * window would flip people offline while they're still logged in and just
 * not looking at this tab. 5 minutes comfortably absorbs that throttling
 * while still going Offline soon after the tab is actually closed.
 */
export const ONLINE_THRESHOLD_MS = 5 * 60_000

/**
 * Real connectivity always wins over the manually-set status: nobody stays
 * "Ocupado"/"Ausente" forever just because that's what they last picked —
 * once their heartbeat goes stale (tab closed, logged out) they show
 * Offline regardless. While actively connected, their manual pick (default
 * Online) is shown as-is.
 */
export function computePresenceLabel(presenceStatus: string, lastActiveAt: string | null): string {
  const isActive = !!lastActiveAt && Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
  return isActive ? (PRESENCE_LABEL[presenceStatus] ?? presenceStatus) : PRESENCE_LABEL.OFFLINE
}

export const ACTIVITY_LABEL: Record<string, string> = {
  ONSITE: "Presencial",
  HOME_OFFICE: "Home office",
  IN_MEETING: "Reunião",
  IN_SERVICE: "Atendimento",
  ON_BREAK: "Intervalo",
  IN_TRAINING: "Treinamento",
  ON_VACATION: "Férias",
  ON_LEAVE: "Afastado",
  UNAVAILABLE: "Indisponível",
}
