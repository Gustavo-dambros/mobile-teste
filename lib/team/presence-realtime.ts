"use client"

import * as React from "react"

import { createClient } from "@/lib/supabase/client"
import type { DirectoryMember } from "@/lib/team/directory"

const TEAM_PRESENCE_CHANNEL = "team-directory-presence"
const MEMBER_UPDATED_EVENT = "member-updated"
const POLL_INTERVAL_MS = 15_000
const SEND_TIMEOUT_MS = 4000

// One client (one underlying WebSocket connection) shared by every listener
// and sender in this module, instead of each broadcast spinning up its own —
// that repeated connect/teardown cycle was a real source of perceived lag.
const supabase = createClient()

let sendChannel: ReturnType<typeof supabase.channel> | null = null
let joinPromise: Promise<boolean> | null = null

function getSendChannel() {
  if (!sendChannel) sendChannel = supabase.channel(TEAM_PRESENCE_CHANNEL)
  return sendChannel
}

function ensureJoined(): Promise<boolean> {
  if (joinPromise) return joinPromise
  const channel = getSendChannel()
  joinPromise = new Promise<boolean>((resolve) => {
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        resolve(true)
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (err) console.error("[team-presence] send channel join failed", status, err)
        joinPromise = null
        resolve(false)
      }
    })
  })
  return joinPromise
}

interface TeamPresenceUpdate {
  id: string
  presence: string
  activity: string
}

function applyUpdates(
  members: DirectoryMember[],
  updates: Map<string, { presence: string; activity: string }>
): DirectoryMember[] {
  let changed = false
  const next = members.map((m) => {
    const update = updates.get(m.id)
    if (!update || (update.presence === m.presence && update.activity === m.activity)) return m
    changed = true
    return { ...m, presence: update.presence, activity: update.activity }
  })
  return changed ? next : members
}

export async function broadcastTeamPresenceUpdate(update: TeamPresenceUpdate) {
  const joined = await Promise.race([
    ensureJoined(),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), SEND_TIMEOUT_MS)),
  ])
  if (!joined) return

  try {
    await getSendChannel().send({ type: "broadcast", event: MEMBER_UPDATED_EVENT, payload: update })
  } catch (error) {
    console.error("[team-presence] broadcast send failed", error)
  }
}

/**
 * Presence/activity updates are pushed live via Realtime Broadcast, with a
 * polling fallback (every 15s) so the roster still converges even if a
 * client's network blocks WebSocket upgrades (broadcast fails silently in
 * that case — polling is the reliability backstop).
 */
export function useTeamPresence(initialMembers: DirectoryMember[]) {
  const [members, setMembers] = React.useState(initialMembers)
  const [prevInitialMembers, setPrevInitialMembers] = React.useState(initialMembers)

  if (initialMembers !== prevInitialMembers) {
    setPrevInitialMembers(initialMembers)
    setMembers(initialMembers)
  }

  React.useEffect(() => {
    const channel = supabase
      .channel(TEAM_PRESENCE_CHANNEL)
      .on("broadcast", { event: MEMBER_UPDATED_EVENT }, ({ payload }) => {
        const update = payload as TeamPresenceUpdate
        setMembers((prev) => applyUpdates(prev, new Map([[update.id, update]])))
      })
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[team-presence] subscribe failed", status, err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch("/api/team/presence")
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          members: { id: string; presence: string; activity: string }[]
        }
        const updates = new Map(data.members.map((m) => [m.id, m]))
        if (!cancelled) setMembers((prev) => applyUpdates(prev, updates))
      } catch (error) {
        console.error("[team-presence] poll failed", error)
      }
    }

    const interval = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return members
}
