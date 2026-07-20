"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, SearchIcon } from "lucide-react"

import type { Ticket } from "@/components/tickets/types"
import { formatDate, formatDuration, formatTime } from "@/lib/tickets/format"
import { TicketStatusBadge } from "@/lib/tickets/status-badge"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function TicketChatHeader({
  ticket,
  searchActive,
  onToggleSearch,
  actions,
}: {
  ticket: Ticket
  searchActive: boolean
  onToggleSearch: () => void
  /** The section-specific 3-dot menu (differs between Meus Chamados / Chamados / Histórico). */
  actions: ReactNode
}) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-2 border-b bg-background px-4 py-3 lg:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon />
          <span className="sr-only">Voltar para a lista</span>
        </Button>

        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          {ticket.number}
        </span>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
          {ticket.title}
        </h1>

        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", searchActive && "bg-muted")}
          onClick={onToggleSearch}
        >
          <SearchIcon />
          <span className="sr-only">Pesquisar mensagens</span>
        </Button>

        <div className="shrink-0">{actions}</div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-10">
        <TicketStatusBadge ticket={ticket} />
        <Badge
          variant={
            ticket.priority === "Alta"
              ? "destructive"
              : ticket.priority === "Média"
                ? "secondary"
                : "outline"
          }
          className="px-1.5"
        >
          {ticket.priority}
        </Badge>
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {ticket.sector}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {ticket.assignee ? (
            <>Responsável: {ticket.assignee}</>
          ) : (
            <span className="italic">Aguardando atribuição</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(ticket.createdAt)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTime(ticket.createdAt)}
        </span>
        {ticket.firstResponseAt ? (
          <span className="text-xs text-muted-foreground">
            Primeira resposta em{" "}
            {formatDuration(new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime())}
          </span>
        ) : (
          ticket.status !== "Concluído" && (
            <Badge variant="outline" className="px-1.5 text-amber-600 dark:text-amber-400">
              Aguardando resposta há {formatDuration(Date.now() - new Date(ticket.createdAt).getTime())}
            </Badge>
          )
        )}
      </div>
    </div>
  )
}
