"use client"

import * as React from "react"

const POLL_INTERVAL_MS = 15_000

/** Lightweight id -> "Online"/"Ocupado"/"Ausente"/"Offline" lookup, backed by the same
 * real (login/heartbeat-based) presence used on the Team page and Dashboard — see
 * app/api/team/presence/route.ts and lib/team/presence-labels.ts. Self-contained polling,
 * for callers (like the reuniões participants panel) that just need a quick lookup rather
 * than the full team directory. */
export function usePresenceMap(): Map<string, string> {
  const [presence, setPresence] = React.useState<Map<string, string>>(new Map())

  React.useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch("/api/team/presence")
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { members: { id: string; presence: string }[] }
        setPresence(new Map(data.members.map((m) => [m.id, m.presence])))
      } catch {
        // silent — next poll retries
      }
    }

    poll()
    const interval = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return presence
}
