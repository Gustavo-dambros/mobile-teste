"use client"

import { useCurrentUser } from "@/lib/current-user/context"
import { getCalendarColor } from "@/lib/atividades-setor/colors"
import { useRosterMember } from "@/lib/chat-interno/use-roster"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

/**
 * Avatar ringed and tinted with the user's dynamic calendarColor — the
 * single visual anchor tying a person together across the calendar,
 * Kanban cards, comments and filters. Never a fixed/hardcoded color.
 */
export function UserAvatarBadge({
  userId,
  size = "default",
  showName = false,
  className,
}: {
  userId: string
  size?: "sm" | "default" | "lg"
  showName?: boolean
  className?: string
}) {
  const currentUser = useCurrentUser()
  // The roster endpoint excludes the caller themselves — resolve "me" from
  // the session instead of expecting to find my own id in it.
  const rosterMember = useRosterMember(currentUser?.id === userId ? undefined : userId)
  const name = currentUser?.id === userId ? currentUser.name : rosterMember?.name
  const color = getCalendarColor(userId)
  if (!name) return null

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Avatar size={size} className="shrink-0" style={{ boxShadow: `0 0 0 2px ${color}` }}>
        <AvatarFallback style={{ backgroundColor: `${color}26`, color }}>{initials(name)}</AvatarFallback>
      </Avatar>
      {showName && <span className="truncate text-sm">{name}</span>}
    </span>
  )
}
