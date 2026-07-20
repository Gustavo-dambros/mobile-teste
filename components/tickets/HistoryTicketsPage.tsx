"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { SearchIcon } from "lucide-react"

import type { Ticket } from "@/components/tickets/types"
import { useCurrentUser } from "@/lib/current-user/context"
import { useTickets } from "@/lib/tickets/store"
import { fadeIn } from "@/lib/motion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  TicketFilters,
  defaultTicketFilters,
  type TicketFiltersValue,
} from "@/components/tickets/TicketFilters"
import { TicketList } from "@/components/tickets/TicketList"
import { TicketsPagination } from "@/components/tickets/TicketsPagination"
import { HistoryActionsMenu } from "@/components/tickets/HistoryActionsMenu"
import { ReopenTicketDialog } from "@/components/tickets/ReopenTicketDialog"

const PAGE_SIZE = 14

export function HistoryTicketsPage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const currentUser = useCurrentUser()
  const { tickets } = useTickets()
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<TicketFiltersValue>(
    defaultTicketFilters
  )
  const [page, setPage] = React.useState(1)

  const [reopeningTicket, setReopeningTicket] = React.useState<Ticket | null>(null)

  const filteredTickets = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return tickets.filter((ticket) => {
      if (ticket.deleted) return false
      if (ticket.sector !== currentUser?.sector) return false
      if (ticket.status !== "Concluído") return false
      if (query && !ticket.title.toLowerCase().includes(query)) return false
      if (
        filters.priorities.length &&
        !filters.priorities.includes(ticket.priority)
      )
        return false
      if (filters.assignee && ticket.assignee !== filters.assignee) return false
      if (filters.date && !ticket.createdAt.startsWith(filters.date))
        return false
      return true
    })
  }, [tickets, search, filters, currentUser])

  const filtersKey = `${search}|${JSON.stringify(filters)}`
  const [lastFiltersKey, setLastFiltersKey] = React.useState(filtersKey)
  if (filtersKey !== lastFiltersKey) {
    setLastFiltersKey(filtersKey)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageTickets = filteredTickets.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  return (
    <motion.div
      variants={fadeIn(reduced, 0.1)}
      initial="hidden"
      animate="show"
      className="flex h-full min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Label htmlFor="history-search" className="sr-only">
            Buscar chamado
          </Label>
          <Input
            id="history-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar chamado por título"
            className="h-8 pl-8"
          />
        </div>
        <TicketFilters value={filters} onChange={setFilters} mode="history" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <TicketList
          tickets={pageTickets}
          onRowClick={(ticket) =>
            router.push(`/atendimentos/historico/${ticket.id}`)
          }
          personColumnLabel="Aberto por"
          getPersonName={(ticket) => ticket.requesterName}
          renderActions={(ticket) => (
            <HistoryActionsMenu onReopen={() => setReopeningTicket(ticket)} />
          )}
        />
      </div>

      <TicketsPagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={filteredTickets.length}
      />

      <ReopenTicketDialog
        ticket={reopeningTicket}
        onOpenChange={(open) => !open && setReopeningTicket(null)}
      />
    </motion.div>
  )
}
