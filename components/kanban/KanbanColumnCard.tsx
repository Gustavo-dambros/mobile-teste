"use client"

import * as React from "react"
import { toast } from "sonner"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon, PlusIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard as KanbanCardType, KanbanColumn } from "@/components/kanban/types"
import { ColumnActionsMenu } from "@/components/kanban/ColumnActionsMenu"
import { SortableKanbanCard } from "@/components/kanban/SortableKanbanCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function KanbanColumnCard({
  column,
  columns,
  cards,
  onCardClick,
}: {
  column: KanbanColumn
  columns: KanbanColumn[]
  cards: KanbanCardType[]
  onCardClick: (cardId: string) => void
}) {
  const { createCard, updateColumn } = useKanban()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState(column.title)

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) {
      setIsAdding(false)
      return
    }
    const result = await createCard(column.boardId, column.id, newTitle)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível criar a atividade")
      return
    }
    setNewTitle("")
  }

  function handleRename() {
    if (!renameValue.trim() || renameValue.trim() === column.title) {
      setIsRenaming(false)
      setRenameValue(column.title)
      return
    }
    updateColumn(column.id, { title: renameValue.trim() })
    setIsRenaming(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl border bg-muted/30 p-2",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-1 px-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Reordenar coluna ${column.title}`}
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
        {column.color && (
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} aria-hidden />
        )}
        {isRenaming ? (
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              handleRename()
            }}
          >
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsRenaming(false)
                  setRenameValue(column.title)
                }
              }}
              className="h-7"
              aria-label="Renomear coluna"
            />
          </form>
        ) : (
          <button
            type="button"
            onDoubleClick={() => setIsRenaming(true)}
            className="flex-1 truncate rounded px-1 text-left text-sm font-medium hover:bg-muted"
          >
            {column.title}
          </button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">{cards.length}</span>
        <ColumnActionsMenu
          column={column}
          columns={columns}
          cards={cards}
          onAddCard={() => setIsAdding(true)}
          onRename={() => setIsRenaming(true)}
        />
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          className="flex min-h-3 flex-col gap-2 overflow-y-auto px-0.5 pb-0.5"
          style={{ maxHeight: "calc(100vh - 22rem)" }}
        >
          {cards.map((card) => (
            <SortableKanbanCard key={card.id} card={card} columns={columns} onClick={() => onCardClick(card.id)} />
          ))}
        </div>
      </SortableContext>

      {isAdding ? (
        <form onSubmit={handleAddCard} className="flex flex-col gap-1.5 px-0.5">
          <Input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título da atividade"
            aria-label="Título da nova atividade"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsAdding(false)
                setNewTitle("")
              }
            }}
          />
          <div className="flex items-center gap-1.5">
            <Button type="submit" size="sm">
              Adicionar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setIsAdding(false)
                setNewTitle("")
              }}
            >
              <XIcon />
              <span className="sr-only">Cancelar</span>
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          onClick={() => setIsAdding(true)}
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar atividade
        </Button>
      )}
    </div>
  )
}
