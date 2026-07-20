"use client"

import * as React from "react"

export interface RosterMember {
  id: string
  name: string
  sector: string
  email: string
  phone: string
}

/** Every active colleague except the current user, for DM/group member pickers and name lookups. */
export function useChatRoster(): RosterMember[] {
  const [members, setMembers] = React.useState<RosterMember[]>([])

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/chat-interno/roster")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMembers(data.members ?? [])
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return members
}

export function useRosterMember(id: string | undefined): RosterMember | undefined {
  const members = useChatRoster()
  return React.useMemo(() => members.find((m) => m.id === id), [members, id])
}
