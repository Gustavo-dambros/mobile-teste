"use client"

import * as React from "react"
import { toast } from "sonner"

import type { Ticket } from "@/components/tickets/types"
import { useTickets } from "@/lib/tickets/store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

export function ReopenTicketDialog({
  ticket,
  onOpenChange,
}: {
  ticket: Ticket | null
  onOpenChange: (open: boolean) => void
}) {
  const { reopenTicket } = useTickets()
  const [reason, setReason] = React.useState("")
  const [loadedTicketId, setLoadedTicketId] = React.useState<string | null>(null)

  if (ticket && ticket.id !== loadedTicketId) {
    setLoadedTicketId(ticket.id)
    setReason("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticket) return
    if (!reason.trim()) {
      toast.error("Informe o motivo da reabertura")
      return
    }
    const ok = await reopenTicket(ticket.id, reason.trim())
    if (!ok) return
    toast.success("Chamado reaberto")
    onOpenChange(false)
  }

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reabrir chamado</DialogTitle>
          <DialogDescription>
            {ticket
              ? `Tem certeza que deseja reabrir o chamado ${ticket.number}? Essa ação será registrada no chat.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="reopen-reason">Motivo da reabertura</FieldLabel>
            <Textarea
              id="reopen-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da reabertura"
              rows={4}
              required
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Confirmar reabertura</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
