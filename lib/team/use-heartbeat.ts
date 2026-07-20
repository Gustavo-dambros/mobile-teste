"use client"

import * as React from "react"

const HEARTBEAT_INTERVAL_MS = 30_000

/**
 * Pings the server every 30s so this user's `last_active_at` stays fresh —
 * the real signal behind the Online/Offline dot everyone else sees on the
 * team page and dashboard (see lib/team/presence-labels.ts, 5-minute grace
 * window). Mounted once, app-wide (app/(app)/layout.tsx), so "online"
 * reflects having the app logged in *anywhere* — another tab, another
 * window, not looking at this one — not just this exact page being focused.
 *
 * The interval alone would still work while the tab is backgrounded
 * (browsers throttle, not fully stop, background timers), but a
 * `visibilitychange` ping makes coming back to the tab reflect instantly
 * instead of waiting up to 30s for the next tick.
 */
export function useTeamHeartbeat() {
  React.useEffect(() => {
    function ping() {
      void fetch("/api/team/heartbeat", { method: "POST" }).catch(() => {
        // silent — next tick retries
      })
    }
    ping()
    const interval = window.setInterval(ping, HEARTBEAT_INTERVAL_MS)

    function onVisible() {
      if (document.visibilityState === "visible") ping()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", ping)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", ping)
    }
  }, [])
}
