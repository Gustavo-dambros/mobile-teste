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

export function DeleteTicketDialog({
  ticket,
  onOpenChange,
  onDeleted,
}: {
  ticket: Ticket | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const { deleteTicket } = useTickets()
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
      toast.error("Informe o motivo da exclusão")
      return
    }
    const ok = await deleteTicket(ticket.id, reason.trim())
    if (!ok) return
    toast.success("Chamado excluído com sucesso")
    onOpenChange(false)
    onDeleted?.()
  }

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir chamado</DialogTitle>
          <DialogDescription>
            {ticket
              ? `Tem certeza que deseja excluir o chamado ${ticket.number}? Essa ação é registrada para auditoria.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="delete-reason">Motivo da exclusão</FieldLabel>
            <Textarea
              id="delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da exclusão"
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
            <Button type="submit" variant="destructive">
              Excluir chamado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
