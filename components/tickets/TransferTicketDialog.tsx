"use client"

import * as React from "react"
import { toast } from "sonner"

import type { Ticket, TicketSector } from "@/components/tickets/types"
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
import { SectorSelect } from "@/components/sector-select"

export function TransferTicketDialog({
  ticket,
  onOpenChange,
}: {
  ticket: Ticket | null
  onOpenChange: (open: boolean) => void
}) {
  const { updateTicket } = useTickets()
  const [sector, setSector] = React.useState<TicketSector>("SP-Suporte Técnico")
  const [loadedTicketId, setLoadedTicketId] = React.useState<string | null>(null)

  if (ticket && ticket.id !== loadedTicketId) {
    setLoadedTicketId(ticket.id)
    setSector(ticket.sector)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticket) return
    if (sector === ticket.sector) {
      toast.error("Selecione um setor diferente do atual")
      return
    }
    const ok = await updateTicket(ticket.id, { sector })
    if (!ok) return
    toast.success("Chamado transferido")
    onOpenChange(false)
  }

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir chamado</DialogTitle>
          <DialogDescription>
            {ticket
              ? `Selecione o setor para o qual o chamado ${ticket.number} será transferido.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="transfer-sector">Setor de destino</FieldLabel>
            <SectorSelect
              id="transfer-sector"
              value={sector}
              onValueChange={(value) => setSector(value as TicketSector)}
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
            <Button type="submit">Transferir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
