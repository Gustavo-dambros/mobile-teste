"use client"

import { XIcon } from "lucide-react"

import type { TicketMessage } from "@/components/tickets/types"
import { Button } from "@/components/ui/button"

export function ReplyPreview({
  message,
  onCancel,
}: {
  message: TicketMessage
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2 lg:px-6">
      <div className="flex min-w-0 flex-1 flex-col border-l-2 border-primary/60 pl-2">
        <span className="text-xs font-medium text-primary">
          Respondendo a {message.authorName}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {message.deletedForEveryone ? "Mensagem apagada" : message.text}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={onCancel}
      >
        <XIcon />
        <span className="sr-only">Cancelar resposta</span>
      </Button>
    </div>
  )
}
