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

export function CloseTicketDialog({
  ticket,
  onOpenChange,
}: {
  ticket: Ticket | null
  onOpenChange: (open: boolean) => void
}) {
  const { closeTicket } = useTickets()
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
      toast.error("Informe o motivo do fechamento")
      return
    }
    const ok = await closeTicket(ticket.id, reason.trim())
    if (!ok) return
    toast.success("Chamado encerrado com sucesso")
    onOpenChange(false)
  }

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar chamado</DialogTitle>
          <DialogDescription>
            {ticket
              ? `Tem certeza que deseja encerrar o chamado ${ticket.number}? Essa ação será registrada no chat.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="close-reason">Motivo do fechamento</FieldLabel>
            <Textarea
              id="close-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do encerramento"
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
            <Button type="submit">Confirmar fechamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
