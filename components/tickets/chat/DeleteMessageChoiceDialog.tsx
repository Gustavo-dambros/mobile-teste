"use client"

import type { TicketMessage } from "@/components/tickets/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function DeleteMessageChoiceDialog({
  message,
  onOpenChange,
  onChooseForMe,
  onChooseForEveryone,
}: {
  message: TicketMessage | null
  onOpenChange: (open: boolean) => void
  onChooseForMe: () => void
  onChooseForEveryone: () => void
}) {
  return (
    <Dialog open={!!message} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Apagar mensagem</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="justify-start" onClick={onChooseForMe}>
            Apagar para mim
          </Button>
          {message?.isOwn && (
            <Button
              variant="outline"
              className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onChooseForEveryone}
            >
              Apagar para todos
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
