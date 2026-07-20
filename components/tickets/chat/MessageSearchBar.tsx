"use client"

import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MessageSearchBar({
  query,
  onQueryChange,
  matchCount,
  matchIndex,
  onPrevMatch,
  onNextMatch,
  onClose,
}: {
  query: string
  onQueryChange: (value: string) => void
  matchCount: number
  matchIndex: number
  onPrevMatch: () => void
  onNextMatch: () => void
  onClose: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-muted/30 px-4 py-2 lg:px-6">
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
      <Input
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Pesquisar mensagens..."
        className="h-8 flex-1"
      />
      <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
        {query.trim()
          ? matchCount > 0
            ? `${matchIndex + 1} de ${matchCount}`
            : "0 resultados"
          : ""}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        disabled={matchCount === 0}
        onClick={onPrevMatch}
      >
        <ChevronUpIcon className="size-4" />
        <span className="sr-only">Resultado anterior</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        disabled={matchCount === 0}
        onClick={onNextMatch}
      >
        <ChevronDownIcon className="size-4" />
        <span className="sr-only">Próximo resultado</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={onClose}
      >
        <XIcon className="size-4" />
        <span className="sr-only">Fechar busca</span>
      </Button>
    </div>
  )
}
