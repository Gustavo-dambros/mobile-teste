"use client"

import * as React from "react"
import { TrashIcon, XIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function DeleteMessageBar({
  mode,
  selectedCount,
  onCancel,
  onConfirm,
}: {
  mode: "forMe" | "forEveryone"
  selectedCount: number
  onCancel: () => void
  onConfirm: () => void
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-4 py-3 lg:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCancel}
      >
        <XIcon />
        <span className="sr-only">Cancelar seleção</span>
      </Button>
      <span className="text-sm text-muted-foreground">
        {selectedCount} mensagem(ns) selecionada(s)
      </span>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={selectedCount === 0}
          onClick={() => setConfirmOpen(true)}
        >
          <TrashIcon />
          <span className="sr-only">Apagar selecionadas</span>
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar mensagens</AlertDialogTitle>
            <AlertDialogDescription>
              {mode === "forEveryone"
                ? `Tem certeza que deseja apagar ${selectedCount} mensagem(ns) para todos? Essa ação não pode ser desfeita.`
                : `Tem certeza que deseja apagar ${selectedCount} mensagem(ns) apenas para você?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirmOpen(false)
                onConfirm()
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
