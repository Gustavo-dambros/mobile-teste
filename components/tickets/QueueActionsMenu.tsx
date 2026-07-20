"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { EllipsisVerticalIcon } from "lucide-react"

export function QueueActionsMenu({
  showReply = true,
  onAssign,
  onTransfer,
  onPickUp,
  onReply,
  onClose,
}: {
  showReply?: boolean
  onAssign: () => void
  onTransfer: () => void
  onPickUp: () => void
  onReply?: () => void
  onClose: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground data-open:bg-muted"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <EllipsisVerticalIcon />
        <span className="sr-only">Abrir menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={onAssign}>Atribuir</DropdownMenuItem>
        <DropdownMenuItem onClick={onTransfer}>Transferir</DropdownMenuItem>
        <DropdownMenuItem onClick={onPickUp}>Pegar</DropdownMenuItem>
        {showReply && (
          <DropdownMenuItem onClick={onReply}>Responder</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onClose}>Encerrar chamado</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
