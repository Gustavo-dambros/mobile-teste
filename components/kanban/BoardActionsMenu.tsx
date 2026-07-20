"use client"

import * as React from "react"
import { toast } from "sonner"
import { ArchiveIcon, CopyIcon, MoreHorizontalIcon, PencilIcon, StarIcon, Trash2Icon } from "lucide-react"

import { useKanban } from "@/lib/kanban/store"
import type { KanbanBoard } from "@/components/kanban/types"
import { ConfirmDialog } from "@/components/kanban/ConfirmDialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function BoardActionsMenu({ board, onEdit }: { board: KanbanBoard; onEdit: () => void }) {
  const { duplicateBoard, setDefaultBoard, archiveBoard, deleteBoardPermanent } = useKanban()
  const [confirmArchive, setConfirmArchive] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  async function handleDuplicate() {
    const result = await duplicateBoard(board.id)
    toast[result.ok ? "success" : "error"](result.ok ? "Quadro duplicado" : (result.error ?? "Não foi possível duplicar"))
  }

  async function handleSetDefault() {
    const result = await setDefaultBoard(board.id)
    if (!result.ok) toast.error(result.error ?? "Não foi possível definir como principal")
  }

  async function handleArchive() {
    const result = await archiveBoard(board.id)
    toast[result.ok ? "success" : "error"](result.ok ? "Quadro arquivado" : (result.error ?? "Não foi possível arquivar"))
    setConfirmArchive(false)
  }

  async function handleDelete() {
    const result = await deleteBoardPermanent(board.id)
    toast[result.ok ? "success" : "error"](result.ok ? "Quadro excluído" : (result.error ?? "Não foi possível excluir"))
    setConfirmDelete(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreHorizontalIcon />
          <span className="sr-only">Ações do quadro {board.title}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon data-icon="inline-start" />
            Renomear / editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <CopyIcon data-icon="inline-start" />
            Duplicar quadro
          </DropdownMenuItem>
          {!board.isDefault && (
            <DropdownMenuItem onClick={handleSetDefault}>
              <StarIcon data-icon="inline-start" />
              Definir como principal
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirmArchive(true)}>
            <ArchiveIcon data-icon="inline-start" />
            Arquivar quadro
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2Icon data-icon="inline-start" />
            Excluir quadro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Arquivar quadro"
        description={`O quadro "${board.title}" será movido para os itens arquivados. Você pode restaurá-lo quando quiser.`}
        confirmLabel="Arquivar"
        destructive={false}
        onConfirm={handleArchive}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir quadro definitivamente"
        description={`Esta ação remove permanentemente o quadro "${board.title}", suas colunas e atividades. Não é possível desfazer.`}
        confirmLabel="Excluir definitivamente"
        onConfirm={handleDelete}
      />
    </>
  )
}
