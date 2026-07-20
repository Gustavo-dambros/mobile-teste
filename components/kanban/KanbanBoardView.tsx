"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { PlusIcon } from "lucide-react"

import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard as KanbanCardType, KanbanColumn } from "@/components/kanban/types"
import { KanbanCardBody } from "@/components/kanban/KanbanCard"
import { KanbanColumnCard } from "@/components/kanban/KanbanColumnCard"
import { KanbanEmptyState } from "@/components/kanban/StateViews"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Layout {
  order: string[]
  cardsByColumn: Record<string, string[]>
}

function buildLayout(columns: KanbanColumn[], cardsByColumn: Record<string, KanbanCardType[]>): Layout {
  return {
    order: columns.map((c) => c.id),
    cardsByColumn: Object.fromEntries(
      columns.map((c) => [c.id, (cardsByColumn[c.id] ?? []).map((card) => card.id)])
    ),
  }
}

export function KanbanBoardView({
  columns,
  cardsByColumn,
  cardsById,
  onCardClick,
  onCreateColumn,
}: {
  columns: KanbanColumn[]
  cardsByColumn: Record<string, KanbanCardType[]>
  cardsById: Map<string, KanbanCardType>
  onCardClick: (cardId: string) => void
  onCreateColumn: (title: string) => void
}) {
  const { moveColumn, moveCard } = useKanban()
  const [layout, setLayout] = React.useState<Layout>(() => buildLayout(columns, cardsByColumn))
  const draggingRef = React.useRef(false)
  const snapshotRef = React.useRef<Layout | null>(null)
  const [activeCard, setActiveCard] = React.useState<KanbanCardType | null>(null)
  const [activeColumn, setActiveColumn] = React.useState<KanbanColumn | null>(null)
  const [isAddingColumn, setIsAddingColumn] = React.useState(false)
  const [newColumnTitle, setNewColumnTitle] = React.useState("")

  React.useEffect(() => {
    if (!draggingRef.current) {
      setLayout(buildLayout(columns, cardsByColumn))
    }
  }, [columns, cardsByColumn])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    draggingRef.current = true
    snapshotRef.current = layout
    const type = event.active.data.current?.type
    if (type === "column") {
      setActiveColumn(columns.find((c) => c.id === event.active.id) ?? null)
    } else {
      setActiveCard(cardsById.get(String(event.active.id)) ?? null)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    if (active.data.current?.type !== "card") return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    setLayout((prev) => {
      const fromColumn = Object.entries(prev.cardsByColumn).find(([, ids]) => ids.includes(activeId))?.[0]
      if (!fromColumn) return prev
      const overType = over.data.current?.type
      const toColumn =
        overType === "card"
          ? Object.entries(prev.cardsByColumn).find(([, ids]) => ids.includes(overId))?.[0]
          : overId
      if (!toColumn || !prev.cardsByColumn[toColumn]) return prev

      const fromIds = prev.cardsByColumn[fromColumn]
      const activeIndex = fromIds.indexOf(activeId)
      if (activeIndex === -1) return prev

      if (fromColumn === toColumn) {
        const overIndex = fromIds.indexOf(overId)
        if (overIndex === -1 || overIndex === activeIndex) return prev
        return {
          ...prev,
          cardsByColumn: { ...prev.cardsByColumn, [fromColumn]: arrayMove(fromIds, activeIndex, overIndex) },
        }
      }

      const newFromIds = fromIds.filter((id) => id !== activeId)
      const toIds = [...prev.cardsByColumn[toColumn]]
      const overIndex = overType === "card" ? toIds.indexOf(overId) : toIds.length
      toIds.splice(overIndex === -1 ? toIds.length : overIndex, 0, activeId)
      return {
        ...prev,
        cardsByColumn: { ...prev.cardsByColumn, [fromColumn]: newFromIds, [toColumn]: toIds },
      }
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    draggingRef.current = false
    const { active, over } = event
    const activeType = active.data.current?.type
    setActiveCard(null)
    setActiveColumn(null)

    if (!over) {
      if (snapshotRef.current) setLayout(snapshotRef.current)
      return
    }

    if (activeType === "column") {
      const activeId = String(active.id)
      const overId = String(over.id)
      if (activeId === overId) return
      const oldIndex = layout.order.indexOf(activeId)
      const newIndex = layout.order.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return
      const newOrder = arrayMove(layout.order, oldIndex, newIndex)
      setLayout((prev) => ({ ...prev, order: newOrder }))
      const beforeId = newIndex > 0 ? newOrder[newIndex - 1] : null
      const afterId = newIndex < newOrder.length - 1 ? newOrder[newIndex + 1] : null
      const result = await moveColumn(activeId, beforeId, afterId)
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mover a coluna")
        if (snapshotRef.current) setLayout(snapshotRef.current)
      }
      return
    }

    const activeId = String(active.id)
    const toColumn = Object.entries(layout.cardsByColumn).find(([, ids]) => ids.includes(activeId))?.[0]
    if (!toColumn) {
      if (snapshotRef.current) setLayout(snapshotRef.current)
      return
    }
    const ids = layout.cardsByColumn[toColumn]
    const index = ids.indexOf(activeId)
    const beforeId = index > 0 ? ids[index - 1] : null
    const afterId = index < ids.length - 1 ? ids[index + 1] : null
    const result = await moveCard(activeId, toColumn, beforeId, afterId)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível mover a atividade")
      if (snapshotRef.current) setLayout(snapshotRef.current)
    }
  }

  function handleCreateColumn(e: React.FormEvent) {
    e.preventDefault()
    if (!newColumnTitle.trim()) {
      setIsAddingColumn(false)
      return
    }
    onCreateColumn(newColumnTitle.trim())
    setNewColumnTitle("")
    setIsAddingColumn(false)
  }

  if (columns.length === 0) {
    return (
      <KanbanEmptyState
        title="Este quadro ainda não tem colunas"
        description={'Crie colunas como "A fazer", "Em andamento" e "Concluído" — ou os nomes que fizerem mais sentido para você.'}
        action={
          <Button size="sm" onClick={() => setIsAddingColumn(true)}>
            <PlusIcon data-icon="inline-start" />
            Criar primeira coluna
          </Button>
        }
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-start gap-3 overflow-x-auto px-4 pb-4 lg:px-6">
        <SortableContext items={layout.order} strategy={horizontalListSortingStrategy}>
          {layout.order.map((columnId) => {
            const column = columns.find((c) => c.id === columnId)
            if (!column) return null
            const ids = layout.cardsByColumn[columnId] ?? []
            const cards = ids
              .map((id) => cardsById.get(id))
              .filter((c): c is KanbanCardType => !!c)
            return (
              <KanbanColumnCard
                key={column.id}
                column={column}
                columns={columns}
                cards={cards}
                onCardClick={onCardClick}
              />
            )
          })}
        </SortableContext>

        <div className="w-72 shrink-0">
          {isAddingColumn ? (
            <form onSubmit={handleCreateColumn} className="flex flex-col gap-1.5 rounded-xl border bg-muted/30 p-2">
              <Input
                autoFocus
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Nome da coluna"
                aria-label="Nome da nova coluna"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsAddingColumn(false)
                    setNewColumnTitle("")
                  }
                }}
              />
              <div className="flex items-center gap-1.5">
                <Button type="submit" size="sm">
                  Adicionar coluna
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingColumn(false)
                    setNewColumnTitle("")
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setIsAddingColumn(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Adicionar coluna
            </Button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="w-72 rotate-1 shadow-lg">
            <KanbanCardBody card={activeCard} />
          </div>
        )}
        {activeColumn && (
          <div className="w-72 rounded-xl border bg-muted p-2 text-sm font-medium shadow-lg">
            {activeColumn.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
