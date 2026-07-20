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

export function TicketActionsMenu({
  showReply = true,
  isClosed = false,
  onReply,
  onEdit,
  onClose,
  onReopen,
  onDelete,
}: {
  showReply?: boolean
  isClosed?: boolean
  onReply?: () => void
  onEdit: () => void
  onClose: () => void
  onReopen: () => void
  onDelete: () => void
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
        {!isClosed && <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>}
        {showReply && (
          <DropdownMenuItem onClick={onReply}>Responder</DropdownMenuItem>
        )}
        {isClosed ? (
          <DropdownMenuItem onClick={onReopen}>Reabrir chamado</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onClose}>Fechar chamado</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Excluir chamado
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
