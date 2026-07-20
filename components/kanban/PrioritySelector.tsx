"use client"

import { cn } from "@/lib/utils"
import { PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/kanban/constants"
import type { CardPriority } from "@/components/kanban/types"

export function PrioritySelector({
  value,
  onChange,
}: {
  value: CardPriority
  onChange: (priority: CardPriority) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Prioridade">
      {PRIORITY_ORDER.map((priority) => {
        const config = PRIORITY_CONFIG[priority]
        const active = value === priority
        return (
          <button
            key={priority}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(priority)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-foreground/30 bg-muted text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className={cn("size-1.5 rounded-full", config.dotClassName)} aria-hidden />
            {config.label}
          </button>
        )
      })}
    </div>
  )
}
