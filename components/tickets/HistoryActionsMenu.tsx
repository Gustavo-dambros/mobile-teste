"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { EllipsisVerticalIcon } from "lucide-react"

export function HistoryActionsMenu({ onReopen }: { onReopen: () => void }) {
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
        <DropdownMenuItem onClick={onReopen}>Reabrir chamado</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
