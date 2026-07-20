"use client"

import { PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanBoard } from "@/components/kanban/types"
import { BoardActionsMenu } from "@/components/kanban/BoardActionsMenu"
import { Button } from "@/components/ui/button"

export function BoardTabs({
  onCreateBoard,
  onEditBoard,
}: {
  onCreateBoard: () => void
  onEditBoard: (board: KanbanBoard) => void
}) {
  const { boardsForUser, activeBoard, setActiveBoard } = useKanban()

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Quadros">
      {boardsForUser.map((board) => {
        const isActive = board.id === activeBoard?.id
        return (
          <div
            key={board.id}
            className={cn(
              "group flex shrink-0 items-center gap-0.5 rounded-lg border pl-2.5 text-sm transition-colors",
              isActive
                ? "border-border bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveBoard(board.id)}
              className="flex items-center gap-1.5 py-1.5 focus-visible:outline-none"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: board.backgroundValue }}
                aria-hidden
              />
              <span className="max-w-40 truncate font-medium">{board.title}</span>
            </button>
            <BoardActionsMenu board={board} onEdit={() => onEditBoard(board)} />
          </div>
        )
      })}
      <Button variant="ghost" size="sm" onClick={onCreateBoard} className="shrink-0 text-muted-foreground">
        <PlusIcon data-icon="inline-start" />
        Novo quadro
      </Button>
    </div>
  )
}
