"use client"

import type { ReactNode } from "react"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

export function KanbanHeader({
  search,
  onSearchChange,
  filtersSlot,
  notificationSlot,
  archiveSlot,
  boardSwitcherSlot,
}: {
  search: string
  onSearchChange: (value: string) => void
  filtersSlot: ReactNode
  notificationSlot: ReactNode
  archiveSlot: ReactNode
  boardSwitcherSlot: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Meu Kanban</h2>
          <p className="text-sm text-muted-foreground">Organize suas atividades e sua rotina diária</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar atividades..."
              className="w-48 pl-8 sm:w-64"
              aria-label="Pesquisar atividades"
            />
          </div>
          {filtersSlot}
          {notificationSlot}
          {archiveSlot}
        </div>
      </div>
      {boardSwitcherSlot}
    </div>
  )
}
