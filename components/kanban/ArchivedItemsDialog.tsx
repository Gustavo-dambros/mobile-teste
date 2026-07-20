"use client"

import * as React from "react"
import { toast } from "sonner"
import { ArchiveRestoreIcon, Trash2Icon } from "lucide-react"

import { useKanban } from "@/lib/kanban/store"
import { ConfirmDialog } from "@/components/kanban/ConfirmDialog"
import { EmptyArchiveState } from "@/components/kanban/StateViews"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type DeleteTarget = { kind: "board" | "column" | "card"; id: string; label: string }

export function ArchivedItemsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    archivedBoardsForUser,
    activeBoard,
    archivedColumnsForBoard,
    archivedCardsForBoard,
    restoreBoard,
    deleteBoardPermanent,
    restoreColumn,
    deleteColumnPermanent,
    restoreCard,
    deleteCardPermanent,
  } = useKanban()

  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null)

  const archivedColumns = activeBoard ? archivedColumnsForBoard(activeBoard.id) : []
  const archivedCards = activeBoard ? archivedCardsForBoard(activeBoard.id) : []

  async function confirmDelete() {
    if (!deleteTarget) return
    const { kind, id } = deleteTarget
    const result =
      kind === "board"
        ? await deleteBoardPermanent(id)
        : kind === "column"
          ? await deleteColumnPermanent(id)
          : await deleteCardPermanent(id)
    toast[result.ok ? "success" : "error"](
      result.ok ? "Item excluído definitivamente" : (result.error ?? "Não foi possível excluir")
    )
    setDeleteTarget(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Itens arquivados</DialogTitle>
            <DialogDescription>
              Restaure ou exclua definitivamente quadros, colunas e atividades arquivados. Colunas e atividades mostram os
              itens do quadro atual.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="boards" className="flex-1 overflow-hidden">
            <TabsList>
              <TabsTrigger value="boards">Quadros ({archivedBoardsForUser.length})</TabsTrigger>
              <TabsTrigger value="columns">Colunas ({archivedColumns.length})</TabsTrigger>
              <TabsTrigger value="cards">Atividades ({archivedCards.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="boards" className="flex max-h-80 flex-col gap-1 overflow-y-auto pt-2">
              {archivedBoardsForUser.length === 0 && <EmptyArchiveState />}
              {archivedBoardsForUser.map((board) => (
                <div key={board.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: board.backgroundValue }} />
                  <span className="flex-1 truncate text-sm">{board.title}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      restoreBoard(board.id)
                      toast.success("Quadro restaurado")
                    }}
                  >
                    <ArchiveRestoreIcon />
                    <span className="sr-only">Restaurar {board.title}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget({ kind: "board", id: board.id, label: board.title })}
                  >
                    <Trash2Icon />
                    <span className="sr-only">Excluir {board.title} definitivamente</span>
                  </Button>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="columns" className="flex max-h-80 flex-col gap-1 overflow-y-auto pt-2">
              {archivedColumns.length === 0 && <EmptyArchiveState />}
              {archivedColumns.map((column) => (
                <div key={column.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="flex-1 truncate text-sm">{column.title}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      restoreColumn(column.id)
                      toast.success("Coluna restaurada")
                    }}
                  >
                    <ArchiveRestoreIcon />
                    <span className="sr-only">Restaurar {column.title}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget({ kind: "column", id: column.id, label: column.title })}
                  >
                    <Trash2Icon />
                    <span className="sr-only">Excluir {column.title} definitivamente</span>
                  </Button>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="cards" className="flex max-h-80 flex-col gap-1 overflow-y-auto pt-2">
              {archivedCards.length === 0 && <EmptyArchiveState />}
              {archivedCards.map((card) => (
                <div key={card.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="flex-1 truncate text-sm">{card.title}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      restoreCard(card.id)
                      toast.success("Atividade restaurada")
                    }}
                  >
                    <ArchiveRestoreIcon />
                    <span className="sr-only">Restaurar {card.title}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget({ kind: "card", id: card.id, label: card.title })}
                  >
                    <Trash2Icon />
                    <span className="sr-only">Excluir {card.title} definitivamente</span>
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir definitivamente"
        description={`Esta ação exclui "${deleteTarget?.label}" permanentemente e não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        onConfirm={confirmDelete}
      />
    </>
  )
}
