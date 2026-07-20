"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import { ArchiveIcon, PlusIcon } from "lucide-react"

import { pageHeader } from "@/lib/motion"
import { filterCards, useKanbanFiltersState } from "@/lib/kanban/filters"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanBoard, KanbanCard } from "@/components/kanban/types"
import { ArchivedItemsDialog } from "@/components/kanban/ArchivedItemsDialog"
import { BoardFormDialog } from "@/components/kanban/BoardFormDialog"
import { BoardTabs } from "@/components/kanban/BoardTabs"
import { CardDetailDialog } from "@/components/kanban/CardDetailDialog"
import { KanbanBoardView } from "@/components/kanban/KanbanBoardView"
import { KanbanFilters } from "@/components/kanban/KanbanFilters"
import { KanbanHeader } from "@/components/kanban/KanbanHeader"
import { KanbanNotifications } from "@/components/kanban/KanbanNotifications"
import { BoardSkeleton, NoBoardsState, NoSearchResultsState } from "@/components/kanban/StateViews"
import { Button } from "@/components/ui/button"

function KanbanPageInner() {
  const reduced = useReducedMotion()
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    boardsForUser,
    activeBoard,
    setActiveBoard,
    columnsForBoard,
    cardsForColumn,
    labelsForUser,
    getLabel,
    getChecklistsForCard,
    getChecklistItems,
    getAttachmentsForCard,
    createColumn,
  } = useKanban()

  const [isLoading, setIsLoading] = React.useState(true)
  React.useEffect(() => {
    const t = window.setTimeout(() => setIsLoading(false), 400)
    return () => window.clearTimeout(t)
  }, [])

  const { filters, setFilters, clearFilters } = useKanbanFiltersState()
  const [boardFormOpen, setBoardFormOpen] = React.useState(false)
  const [editingBoard, setEditingBoard] = React.useState<KanbanBoard | null>(null)
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  // Seeded straight from the URL on first render (deep link from the
  // notification popup: /kanban?board=..&card=..) instead of an effect.
  const [detailCardId, setDetailCardId] = React.useState<string | null>(() => searchParams.get("card"))

  const handledDeepLinkRef = React.useRef(false)
  React.useEffect(() => {
    if (handledDeepLinkRef.current) return
    const boardId = searchParams.get("board")
    const cardId = searchParams.get("card")
    if (boardId && cardId) {
      handledDeepLinkRef.current = true
      setActiveBoard(boardId)
      router.replace("/kanban")
    }
  }, [searchParams, setActiveBoard, router])

  function handleOpenCardFromNotification(boardId: string, cardId: string) {
    setActiveBoard(boardId)
    setDetailCardId(cardId)
  }

  const columns = React.useMemo(
    () => (activeBoard ? columnsForBoard(activeBoard.id) : []),
    [activeBoard, columnsForBoard]
  )

  const { cardsByColumn, cardsById, hasAnyCards, hasVisibleCards } = React.useMemo(() => {
    const byColumn: Record<string, KanbanCard[]> = {}
    const byId = new Map<string, KanbanCard>()
    let anyCards = false
    let visibleCards = false
    columns.forEach((column) => {
      const all = cardsForColumn(column.id)
      if (all.length > 0) anyCards = true
      const visible = filterCards(all, filters, {
        getLabel,
        getChecklistsForCard,
        getChecklistItems,
        getAttachmentsForCard,
      })
      if (visible.length > 0) visibleCards = true
      byColumn[column.id] = visible
      visible.forEach((card) => byId.set(card.id, card))
    })
    return { cardsByColumn: byColumn, cardsById: byId, hasAnyCards: anyCards, hasVisibleCards: visibleCards }
  }, [columns, cardsForColumn, filters, getLabel, getChecklistsForCard, getChecklistItems, getAttachmentsForCard])

  const isFiltering = !!filters.search || Object.entries(filters).some(([key, value]) => key !== "search" && key !== "dueStart" && key !== "dueEnd" && !!value)

  async function handleCreateColumn(title: string) {
    if (!activeBoard) return
    const result = await createColumn(activeBoard.id, title)
    if (!result.ok) toast.error(result.error ?? "Não foi possível criar a coluna")
    else toast.success("Coluna criada")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 md:gap-5 md:py-6">
      <motion.div variants={pageHeader(reduced, 0.05)} initial="hidden" animate="show">
        <KanbanHeader
          search={filters.search}
          onSearchChange={(value) => setFilters({ ...filters, search: value })}
          filtersSlot={
            <KanbanFilters filters={filters} onFiltersChange={setFilters} onClear={clearFilters} columns={columns} labels={labelsForUser} />
          }
          notificationSlot={<KanbanNotifications onOpenCard={handleOpenCardFromNotification} />}
          archiveSlot={
            <Button variant="outline" size="icon" onClick={() => setArchiveOpen(true)}>
              <ArchiveIcon />
              <span className="sr-only">Itens arquivados</span>
            </Button>
          }
          boardSwitcherSlot={
            boardsForUser.length > 0 ? (
              <BoardTabs
                onCreateBoard={() => {
                  setEditingBoard(null)
                  setBoardFormOpen(true)
                }}
                onEditBoard={(board) => {
                  setEditingBoard(board)
                  setBoardFormOpen(true)
                }}
              />
            ) : undefined
          }
        />
      </motion.div>

      {isLoading ? (
        <BoardSkeleton />
      ) : boardsForUser.length === 0 ? (
        <NoBoardsState
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditingBoard(null)
                setBoardFormOpen(true)
              }}
            >
              <PlusIcon data-icon="inline-start" />
              Criar meu primeiro quadro
            </Button>
          }
        />
      ) : !activeBoard ? (
        <BoardSkeleton />
      ) : hasAnyCards && !hasVisibleCards && isFiltering ? (
        <NoSearchResultsState
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <KanbanBoardView
          columns={columns}
          cardsByColumn={cardsByColumn}
          cardsById={cardsById}
          onCardClick={setDetailCardId}
          onCreateColumn={handleCreateColumn}
        />
      )}

      <BoardFormDialog open={boardFormOpen} onOpenChange={setBoardFormOpen} board={editingBoard} />
      <ArchivedItemsDialog open={archiveOpen} onOpenChange={setArchiveOpen} />
      <CardDetailDialog cardId={detailCardId} onOpenChange={(open) => !open && setDetailCardId(null)} />
    </div>
  )
}

export function KanbanPage() {
  return (
    <React.Suspense fallback={<BoardSkeleton />}>
      <KanbanPageInner />
    </React.Suspense>
  )
}
