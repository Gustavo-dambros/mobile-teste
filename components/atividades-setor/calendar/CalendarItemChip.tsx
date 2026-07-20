"use client"

import { cn } from "@/lib/utils"
import type { CalendarItem } from "@/lib/atividades-setor/calendar-items"

export function CalendarItemChip({
  item,
  onClick,
  dense = true,
}: {
  item: CalendarItem
  onClick: () => void
  dense?: boolean
}) {
  const progress = item.taskProgress
  const allDone = !!progress && progress.total > 0 && progress.done === progress.total

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex w-full items-center gap-1.5 overflow-hidden rounded-md border-l-2 bg-muted/50 px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted"
      style={{ borderLeftColor: item.color }}
    >
      {!item.allDay && item.time && (
        <span className="shrink-0 tabular-nums text-muted-foreground">{item.time}</span>
      )}
      <span className={cn("truncate", dense ? "flex-1" : "")}>{item.title}</span>
      {progress && (
        <span
          className={cn(
            "shrink-0 tabular-nums text-muted-foreground",
            allDone && "font-medium text-emerald-600 dark:text-emerald-400"
          )}
        >
          {progress.done}/{progress.total}
        </span>
      )}
    </button>
  )
}
