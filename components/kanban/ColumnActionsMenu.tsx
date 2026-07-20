"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  ListChecksIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { PRIORITY_ORDER, SWATCH_PALETTE } from "@/lib/kanban/constants"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard, KanbanColumn } from "@/components/kanban/types"
import { ConfirmDialog } from "@/components/kanban/ConfirmDialog"
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

type SortMode = "manual" | "created" | "due" | "priority" | "alpha" | "updated"

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "manual", label: "Ordem manual" },
  { value: "created", label: "Data de criação" },
  { value: "due", label: "Data de entrega" },
  { value: "priority", label: "Prioridade" },
  { value: "alpha", label: "Ordem alfabética" },
  { value: "updated", label: "Atualização mais recente" },
]

export function ColumnActionsMenu({
  column,
  columns,
  cards,
  onAddCard,
  onRename,
}: {
  column: KanbanColumn
  columns: KanbanColumn[]
  cards: KanbanCard[]
  onAddCard: () => void
  onRename: () => void
}) {
  const { updateColumn, moveColumn, duplicateColumn, archiveColumn, deleteColumnPermanent, archiveCard, reorderCardsInColumn } =
    useKanban()
  const [confirmArchive, setConfirmArchive] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const index = columns.findIndex((c) => c.id === column.id)
  const canMoveLeft = index > 0
  const canMoveRight = index >= 0 && index < columns.length - 1

  function moveLeft() {
    if (!canMoveLeft) return
    const prev = columns[index - 1]
    const beforeId = index - 2 >= 0 ? columns[index - 2].id : null
    moveColumn(column.id, beforeId, prev.id)
  }

  function moveRight() {
    if (!canMoveRight) return
    const next = columns[index + 1]
    const afterId = index + 2 < columns.length ? columns[index + 2].id : null
    moveColumn(column.id, next.id, afterId)
  }

  function sortBy(mode: SortMode) {
    if (mode === "manual" || cards.length === 0) return
    const sorted = [...cards].sort((a, b) => {
      switch (mode) {
        case "created":
          return a.createdAt.localeCompare(b.createdAt)
        case "due":
          return (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")
        case "priority":
          return PRIORITY_ORDER.indexOf(b.priority) - PRIORITY_ORDER.indexOf(a.priority)
        case "alpha":
          return a.title.localeCompare(b.title, "pt-BR")
        case "updated":
          return b.updatedAt.localeCompare(a.updatedAt)
        default:
          return 0
      }
    })
    reorderCardsInColumn(
      column.id,
      sorted.map((c) => c.id)
    )
    toast.success("Atividades reordenadas")
  }

  function archiveAllCards() {
    if (cards.length === 0) return
    cards.forEach((c) => archiveCard(c.id))
    toast.success("Atividades arquivadas")
  }

  async function handleDuplicate() {
    const result = await duplicateColumn(column.id)
    toast[result.ok ? "success" : "error"](result.ok ? "Coluna duplicada" : (result.error ?? "Não foi possível duplicar"))
  }

  async function handleArchive() {
    const result = await archiveColumn(column.id, cards.length > 0)
    toast[result.ok ? "success" : "error"](result.ok ? "Coluna arquivada" : (result.error ?? "Não foi possível arquivar"))
    setConfirmArchive(false)
  }

  async function handleDelete() {
    const result = await deleteColumnPermanent(column.id)
    toast[result.ok ? "success" : "error"](result.ok ? "Coluna excluída" : (result.error ?? "Não foi possível excluir"))
    setConfirmDelete(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
          <MoreHorizontalIcon />
          <span className="sr-only">Ações da coluna {column.title}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={onAddCard}>
            <PlusIcon data-icon="inline-start" />
            Adicionar atividade
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>
            <PencilIcon data-icon="inline-start" />
            Renomear coluna
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PaletteIcon data-icon="inline-start" />
              Alterar cor
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="grid w-auto grid-cols-6 gap-1 p-1.5">
              {SWATCH_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => updateColumn(column.id, { color: swatch })}
                  aria-label={`Cor ${swatch}`}
                  className={cn(
                    "size-5 rounded-full ring-2 ring-transparent ring-offset-1 ring-offset-popover transition-all",
                    column.color === swatch && "ring-foreground"
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightIcon data-icon="inline-start" />
              Mover coluna
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled={!canMoveLeft} onClick={moveLeft}>
                <ArrowLeftIcon data-icon="inline-start" />
                Mover para a esquerda
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canMoveRight} onClick={moveRight}>
                <ArrowRightIcon data-icon="inline-start" />
                Mover para a direita
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={handleDuplicate}>
            <CopyIcon data-icon="inline-start" />
            Duplicar coluna
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ListChecksIcon data-icon="inline-start" />
              Ordenar atividades
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {SORT_OPTIONS.filter((o) => o.value !== "manual").map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => sortBy(option.value)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={archiveAllCards} disabled={cards.length === 0}>
            <ArchiveIcon data-icon="inline-start" />
            Arquivar todas as atividades
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmArchive(true)}>
            <ArchiveIcon data-icon="inline-start" />
            Arquivar coluna
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2Icon data-icon="inline-start" />
            Excluir coluna
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Arquivar coluna"
        description={
          cards.length > 0
            ? `A coluna "${column.title}" e suas ${cards.length} atividade(s) serão arquivadas. Você pode restaurá-las depois.`
            : `A coluna "${column.title}" será arquivada. Você pode restaurá-la depois.`
        }
        confirmLabel="Arquivar"
        destructive={false}
        onConfirm={handleArchive}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir coluna"
        description={
          cards.length > 0
            ? `Esta coluna possui ${cards.length} atividade(s). Excluir a coluna removerá permanentemente todas elas. Esta ação não pode ser desfeita.`
            : `Tem certeza de que deseja excluir a coluna "${column.title}"? Esta ação não pode ser desfeita.`
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </>
  )
}
