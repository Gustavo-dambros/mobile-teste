"use client"

import * as React from "react"
import { toast } from "sonner"

import type { TicketMessage } from "@/components/tickets/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function EditMessageDialog({
  message,
  onOpenChange,
  onSave,
}: {
  message: TicketMessage | null
  onOpenChange: (open: boolean) => void
  onSave: (id: string, text: string) => void
}) {
  const [text, setText] = React.useState("")
  const [loadedMessageId, setLoadedMessageId] = React.useState<string | null>(null)

  if (message && message.id !== loadedMessageId) {
    setLoadedMessageId(message.id)
    setText(message.text)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message) return
    if (!text.trim()) {
      toast.error("A mensagem não pode ficar em branco")
      return
    }
    onSave(message.id, text.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={!!message} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar mensagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
