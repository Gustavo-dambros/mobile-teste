"use client"

import { useTeamHeartbeat } from "@/lib/team/use-heartbeat"

/** Renders nothing — just keeps the current user's presence heartbeat alive app-wide. */
export function TeamHeartbeat() {
  useTeamHeartbeat()
  return null
}
