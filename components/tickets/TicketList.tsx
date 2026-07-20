"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

import type { Ticket } from "@/components/tickets/types"
import { formatDate, formatTime } from "@/lib/tickets/format"
import { useTickets } from "@/lib/tickets/store"
import { TicketStatusBadge } from "@/lib/tickets/status-badge"
import { listContainer, listItem } from "@/lib/motion"
import { UnreadBadge } from "@/components/tickets/UnreadBadge"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  return (
    <Badge
      variant={
        priority === "Alta"
          ? "destructive"
          : priority === "Média"
            ? "secondary"
            : "outline"
      }
      className="px-1.5"
    >
      {priority}
    </Badge>
  )
}

export function TicketList({
  tickets,
  renderActions,
  onRowClick,
  personColumnLabel = "Responsável",
  getPersonName = (ticket) => ticket.assignee,
}: {
  tickets: Ticket[]
  renderActions: (ticket: Ticket) => React.ReactNode
  onRowClick: (ticket: Ticket) => void
  /** Header label for the person column — "Responsável" (assignee) or "Aberto por" (requester). */
  personColumnLabel?: string
  getPersonName?: (ticket: Ticket) => string
}) {
  const reduced = useReducedMotion()
  const { getUnreadCount } = useTickets()

  return (
    <div className="h-full overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="hidden sm:table-cell">{personColumnLabel}</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden sm:table-cell">Prioridade</TableHead>
            <TableHead className="hidden sm:table-cell">Aberto em</TableHead>
            <TableHead className="hidden sm:table-cell">Horário</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <motion.tbody
          data-slot="table-body"
          className="[&_tr:last-child]:border-0"
          variants={listContainer(reduced)}
          initial="hidden"
          animate="show"
        >
          {tickets.length ? (
            tickets.map((ticket) => (
              <motion.tr
                key={ticket.id}
                data-slot="table-row"
                variants={listItem(reduced)}
                onClick={() => onRowClick(ticket)}
                className="cursor-pointer border-b transition-colors hover:bg-muted/50"
              >
                <TableCell className="text-muted-foreground">
                  {ticket.number}
                </TableCell>
                <TableCell className="max-w-64 font-medium">
                  <span className="flex items-center gap-2">
                    <UnreadBadge count={getUnreadCount(ticket.id)} />
                    <span className="truncate">{ticket.title}</span>
                    {!ticket.firstResponseAt && ticket.status !== "Concluído" && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-amber-500"
                        title="Aguardando primeira resposta"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {getPersonName(ticket) ? (
                    <span>{getPersonName(ticket)}</span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Aguardando atribuição
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <TicketStatusBadge ticket={ticket} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <PriorityBadge priority={ticket.priority} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatDate(ticket.createdAt)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatTime(ticket.createdAt)}
                </TableCell>
                <TableCell>{renderActions(ticket)}</TableCell>
              </motion.tr>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                Nenhum chamado encontrado.
              </TableCell>
            </TableRow>
          )}
        </motion.tbody>
      </Table>
    </div>
  )
}
