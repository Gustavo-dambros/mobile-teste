"use client"

import { WifiOffIcon } from "lucide-react"

import type { ConnectionBadgeState } from "@/lib/media/use-connection-state"

export function ConnectionBadge({ state }: { state: ConnectionBadgeState | null }) {
  if (!state) return null
  return (
    <span className="flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-xs font-medium text-destructive-foreground">
      <WifiOffIcon className="size-3" />
      {state === "reconnecting" ? "Reconectando..." : "Conexão instável"}
    </span>
  )
}
