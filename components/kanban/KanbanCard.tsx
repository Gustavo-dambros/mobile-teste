"use client"

import { CheckCircle2Icon, MessageSquareIcon, PaperclipIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { PRIORITY_CONFIG } from "@/lib/kanban/constants"
import { isDueSoon, isOverdue } from "@/lib/kanban/notifications"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard as KanbanCardType } from "@/components/kanban/types"
import { Badge } from "@/components/ui/badge"

function formatDueLabel(iso: string) {
  const date = new Date(iso)
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${day}, ${time}`
}

export function KanbanCardBody({ card }: { card: KanbanCardType }) {
  const { getLabel, checklistProgress, getCommentsForCard, getAttachmentsForCard } = useKanban()
  const labels = card.labelIds.map((id) => getLabel(id)).filter((l): l is NonNullable<typeof l> => !!l)
  const { completed, total } = checklistProgress(card.id)
  const commentCount = getCommentsForCard(card.id).length
  const attachments = getAttachmentsForCard(card.id)
  const overdue = isOverdue(card)
  const dueSoon = !overdue && isDueSoon(card)
  const priorityConfig = PRIORITY_CONFIG[card.priority]
  const coverAttachment =
    card.coverType === "image" ? attachments.find((a) => a.id === card.coverValue) : undefined

  return (
    <div className="flex flex-col gap-2 overflow-hidden rounded-lg border bg-card text-left shadow-xs">
      {card.coverType === "color" && card.coverValue && (
        <div className="h-8 shrink-0" style={{ backgroundColor: card.coverValue }} aria-hidden />
      )}
      {card.coverType === "image" && coverAttachment && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverAttachment.storageUrl} alt="" className="h-24 w-full shrink-0 object-cover" />
      )}
      <div className="flex flex-col gap-2 p-2.5 pt-0 first:pt-2.5">
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {labels.map((label) => (
              <span
                key={label.id}
                className="h-1.5 w-8 rounded-full"
                style={{ backgroundColor: label.color }}
                title={label.name}
              />
            ))}
          </div>
        )}
        <div className="flex items-start gap-1.5">
          <span
            className={cn("mt-1 size-1.5 shrink-0 rounded-full", priorityConfig.dotClassName)}
            aria-label={`Prioridade ${priorityConfig.label}`}
          />
          <span className="line-clamp-3 text-sm font-medium">{card.title}</span>
          {card.completedAt && (
            <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-label="Concluída" />
          )}
        </div>
        {total > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {completed}/{total}
            </span>
          </div>
        )}
        {(card.dueAt || commentCount > 0 || attachments.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {card.dueAt && (
              <Badge
                variant={overdue ? "destructive" : "outline"}
                className={cn(
                  "gap-1 text-[11px]",
                  dueSoon && "border-amber-500/50 text-amber-600 dark:text-amber-400"
                )}
              >
                {overdue && <TriangleAlertIcon className="size-3" />}
                {formatDueLabel(card.dueAt)}
              </Badge>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <MessageSquareIcon className="size-3" />
                {commentCount}
              </span>
            )}
            {attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <PaperclipIcon className="size-3" />
                {attachments.length}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
