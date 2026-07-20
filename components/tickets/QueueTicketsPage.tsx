"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { SearchIcon } from "lucide-react"
import { toast } from "sonner"

import type { Ticket } from "@/components/tickets/types"
import { useCurrentUser } from "@/lib/current-user/context"
import { useTickets } from "@/lib/tickets/store"
import { isTicketOverdue } from "@/lib/tickets/status-badge"
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
import { QueueActionsMenu } from "@/components/tickets/QueueActionsMenu"
import { AssignTicketDialog } from "@/components/tickets/AssignTicketDialog"
import { TransferTicketDialog } from "@/components/tickets/TransferTicketDialog"
import { CloseTicketDialog } from "@/components/tickets/CloseTicketDialog"

const PAGE_SIZE = 14

export function QueueTicketsPage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const currentUser = useCurrentUser()
  const { tickets, updateTicket } = useTickets()
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<TicketFiltersValue>(
    defaultTicketFilters
  )
  const [page, setPage] = React.useState(1)

  const [assigningTicket, setAssigningTicket] = React.useState<Ticket | null>(null)
  const [transferringTicket, setTransferringTicket] = React.useState<Ticket | null>(null)
  const [closingTicket, setClosingTicket] = React.useState<Ticket | null>(null)

  function openChat(ticket: Ticket) {
    router.push(`/atendimentos/chamados/${ticket.id}`)
  }

  // updateTicket already shows its own error toast on failure (e.g. someone
  // else claimed it first, see the 409 conflict guard server-side) — only
  // confirm here once the request actually succeeds, same fix already
  // applied to TicketChatPage.tsx's handlePickUp.
  async function handlePickUp(ticket: Ticket) {
    if (!currentUser) return
    const ok = await updateTicket(ticket.id, { assigneeId: currentUser.id })
    if (ok) toast.success("Chamado atribuído para você")
  }

  const filteredTickets = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = tickets.filter((ticket) => {
      if (ticket.deleted) return false
      if (ticket.sector !== currentUser?.sector) return false
      if (ticket.status === "Concluído") return false
      if (query && !ticket.title.toLowerCase().includes(query)) return false
      if (
        filters.priorities.length &&
        !filters.priorities.includes(ticket.priority)
      )
        return false
      if (filters.queueOnly && ticket.status !== "Aberto") return false
      if (filters.onlyMine && ticket.assigneeId !== currentUser?.id)
        return false
      if (filters.overdueOnly && !isTicketOverdue(ticket)) return false
      if (filters.assignee && ticket.assignee !== filters.assignee) return false
      if (filters.date && !ticket.createdAt.startsWith(filters.date))
        return false
      return true
    })
    // Overdue tickets first so staff triage by SLA breach instead of having
    // to eyeball every row for the red badge — stable sort keeps everything
    // else in its existing (most-recent-first) order.
    return filtered.sort((a, b) => Number(isTicketOverdue(b)) - Number(isTicketOverdue(a)))
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
            <Label htmlFor="queue-search" className="sr-only">
              Buscar chamado
            </Label>
            <Input
              id="queue-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar chamado por título"
              className="h-8 pl-8"
            />
          </div>
          <TicketFilters value={filters} onChange={setFilters} mode="queue" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <TicketList
          tickets={pageTickets}
          onRowClick={openChat}
          personColumnLabel="Aberto por"
          getPersonName={(ticket) => ticket.requesterName}
          renderActions={(ticket) => (
            <QueueActionsMenu
              onAssign={() => setAssigningTicket(ticket)}
              onTransfer={() => setTransferringTicket(ticket)}
              onPickUp={() => handlePickUp(ticket)}
              onReply={() => openChat(ticket)}
              onClose={() => setClosingTicket(ticket)}
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

      <AssignTicketDialog
        ticket={assigningTicket}
        onOpenChange={(open) => !open && setAssigningTicket(null)}
      />
      <TransferTicketDialog
        ticket={transferringTicket}
        onOpenChange={(open) => !open && setTransferringTicket(null)}
      />
      <CloseTicketDialog
        ticket={closingTicket}
        onOpenChange={(open) => !open && setClosingTicket(null)}
      />
    </motion.div>
  )
}
