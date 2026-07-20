"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { SearchIcon } from "lucide-react"

import type { Ticket } from "@/components/tickets/types"
import { useCurrentUser } from "@/lib/current-user/context"
import { useTickets } from "@/lib/tickets/store"
import { fadeIn } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  TicketFilters,
  defaultTicketFilters,
  type TicketFiltersValue,
} from "@/components/tickets/TicketFilters"
import { TicketList } from "@/components/tickets/TicketList"
import { TicketsPagination } from "@/components/tickets/TicketsPagination"
import { TicketActionsMenu } from "@/components/tickets/TicketActionsMenu"
import { EditTicketDialog } from "@/components/tickets/EditTicketDialog"
import { CloseTicketDialog } from "@/components/tickets/CloseTicketDialog"
import { DeleteTicketDialog } from "@/components/tickets/DeleteTicketDialog"
import { ReopenTicketDialog } from "@/components/tickets/ReopenTicketDialog"

const PAGE_SIZE = 14

export function TicketsPage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const currentUser = useCurrentUser()
  const { tickets, openCreateDialog } = useTickets()
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<TicketFiltersValue>(
    defaultTicketFilters
  )
  const [page, setPage] = React.useState(1)

  const [editingTicket, setEditingTicket] = React.useState<Ticket | null>(null)
  const [closingTicket, setClosingTicket] = React.useState<Ticket | null>(null)
  const [deletingTicket, setDeletingTicket] = React.useState<Ticket | null>(null)
  const [reopeningTicket, setReopeningTicket] = React.useState<Ticket | null>(null)

  const filteredTickets = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return tickets.filter((ticket) => {
      if (ticket.deleted) return false
      if (ticket.requesterId !== currentUser?.id) return false
      if (query && !ticket.title.toLowerCase().includes(query)) return false
      if (
        filters.statuses.length &&
        !filters.statuses.includes(ticket.status)
      )
        return false
      if (
        filters.priorities.length &&
        !filters.priorities.includes(ticket.priority)
      )
        return false
      if (!filters.showCompleted && ticket.status === "Concluído") return false
      if (
        !filters.showClosedByMe &&
        ticket.closedById === currentUser?.id
      )
        return false
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
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Label htmlFor="ticket-search" className="sr-only">
              Buscar chamado
            </Label>
            <Input
              id="ticket-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar chamado por título"
              className="h-8 pl-8"
            />
          </div>
          <TicketFilters value={filters} onChange={setFilters} />
        </div>
        <Button onClick={openCreateDialog}>Iniciar Atendimento</Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <TicketList
          tickets={pageTickets}
          onRowClick={(ticket) =>
            router.push(`/atendimentos/meus-chamados/${ticket.id}`)
          }
          renderActions={(ticket) => (
            <TicketActionsMenu
              isClosed={ticket.status === "Concluído"}
              onReply={() =>
                router.push(`/atendimentos/meus-chamados/${ticket.id}`)
              }
              onEdit={() => setEditingTicket(ticket)}
              onClose={() => setClosingTicket(ticket)}
              onReopen={() => setReopeningTicket(ticket)}
              onDelete={() => setDeletingTicket(ticket)}
            />
          )}
        />
      </div>

      <TicketsPagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={filteredTickets.length}
      />

      <EditTicketDialog
        ticket={editingTicket}
        onOpenChange={(open) => !open && setEditingTicket(null)}
      />
      <CloseTicketDialog
        ticket={closingTicket}
        onOpenChange={(open) => !open && setClosingTicket(null)}
      />
      <DeleteTicketDialog
        ticket={deletingTicket}
        onOpenChange={(open) => !open && setDeletingTicket(null)}
      />
      <ReopenTicketDialog
        ticket={reopeningTicket}
        onOpenChange={(open) => !open && setReopeningTicket(null)}
      />
    </motion.div>
  )
}
