import { AlertTriangleIcon, CircleCheckIcon, ClockIcon, LoaderIcon } from "lucide-react"

import type { Ticket } from "@/components/tickets/types"
import { Badge } from "@/components/ui/badge"

export const OVERDUE_HOURS = 4

type OverdueCheckTicket = Pick<Ticket, "status" | "createdAt" | "firstResponseAt">

/** A ticket is "Atrasado" when it's still waiting on staff (no first response
 * yet, not closed) past OVERDUE_HOURS since it was opened — a display-only
 * state computed from existing fields, not a stored status value. */
export function isTicketOverdue(ticket: OverdueCheckTicket): boolean {
  if (ticket.status === "Concluído" || ticket.firstResponseAt) return false
  return Date.now() - new Date(ticket.createdAt).getTime() >= OVERDUE_HOURS * 60 * 60 * 1000
}

export function TicketStatusBadge({ ticket }: { ticket: OverdueCheckTicket }) {
  const overdue = isTicketOverdue(ticket)
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      {ticket.status === "Concluído" ? (
        <CircleCheckIcon className="fill-green-500 dark:fill-green-400" />
      ) : overdue ? (
        <AlertTriangleIcon className="text-red-500 dark:text-red-400" />
      ) : ticket.status === "Em andamento" ? (
        <LoaderIcon className="text-orange-500 dark:text-orange-400" />
      ) : (
        <ClockIcon className="text-blue-500 dark:text-blue-400" />
      )}
      {overdue ? "Atrasado" : ticket.status}
    </Badge>
  )
}
