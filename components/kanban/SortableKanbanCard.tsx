"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn } from "@/lib/utils"
import type { KanbanCard as KanbanCardType, KanbanColumn } from "@/components/kanban/types"
import { CardActionsMenu } from "@/components/kanban/CardActionsMenu"
import { KanbanCardBody } from "@/components/kanban/KanbanCard"

export function SortableKanbanCard({
  card,
  columns,
  onClick,
}: {
  card: KanbanCardType
  columns: KanbanColumn[]
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", columnId: card.columnId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group/card relative touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <KanbanCardBody card={card} />
      </button>
      <div className="absolute top-1.5 right-1.5">
        <CardActionsMenu card={card} columns={columns} onOpen={onClick} />
      </div>
    </div>
  )
}
