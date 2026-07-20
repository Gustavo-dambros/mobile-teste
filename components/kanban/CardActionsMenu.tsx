"use client"

import { ArchiveIcon, CheckCircle2Icon, CopyIcon, MoreVerticalIcon, RotateCcwIcon, SquareArrowRightIcon } from "lucide-react"
import { toast } from "sonner"

import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard, KanbanColumn } from "@/components/kanban/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Per-card quick menu — also the keyboard/screen-reader alternative to dragging a card between columns. */
export function CardActionsMenu({
  card,
  columns,
  onOpen,
}: {
  card: KanbanCard
  columns: KanbanColumn[]
  onOpen: () => void
}) {
  const { moveCard, duplicateCard, completeCard, reopenCard, archiveCard } = useKanban()

  async function handleMoveTo(columnId: string) {
    if (columnId === card.columnId) return
    const result = await moveCard(card.id, columnId, null, null)
    if (!result.ok) toast.error(result.error ?? "Não foi possível mover a atividade")
    else toast.success("Atividade movida")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <MoreVerticalIcon />
        <span className="sr-only">Ações da atividade {card.title}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onOpen}>Abrir atividade</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SquareArrowRightIcon data-icon="inline-start" />
            Mover para coluna
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {columns.map((column) => (
              <DropdownMenuItem
                key={column.id}
                disabled={column.id === card.columnId}
                onClick={() => handleMoveTo(column.id)}
              >
                {column.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => duplicateCard(card.id)}>
          <CopyIcon data-icon="inline-start" />
          Duplicar
        </DropdownMenuItem>
        {card.completedAt ? (
          <DropdownMenuItem onClick={() => reopenCard(card.id)}>
            <RotateCcwIcon data-icon="inline-start" />
            Reabrir atividade
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => completeCard(card.id)}>
            <CheckCircle2Icon data-icon="inline-start" />
            Marcar como concluída
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => archiveCard(card.id)}>
          <ArchiveIcon data-icon="inline-start" />
          Arquivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
