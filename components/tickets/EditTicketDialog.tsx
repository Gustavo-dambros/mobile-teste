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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function EditTicketDialog({
  ticket,
  onOpenChange,
}: {
  ticket: Ticket | null
  onOpenChange: (open: boolean) => void
}) {
  const { updateTicket } = useTickets()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [loadedTicketId, setLoadedTicketId] = React.useState<string | null>(null)

  if (ticket && ticket.id !== loadedTicketId) {
    setLoadedTicketId(ticket.id)
    setTitle(ticket.title)
    setDescription(ticket.description)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticket) return
    if (!title.trim()) {
      toast.error("O título não pode ficar em branco")
      return
    }

    const changes: Partial<Pick<Ticket, "title" | "description">> = {}
    if (title.trim() !== ticket.title) changes.title = title.trim()
    if (description.trim() !== ticket.description) changes.description = description.trim()

    if (Object.keys(changes).length === 0) {
      onOpenChange(false)
      return
    }

    const ok = await updateTicket(ticket.id, changes)
    if (!ok) return
    toast.success("Chamado atualizado com sucesso")
    onOpenChange(false)
  }

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar chamado</DialogTitle>
          <DialogDescription>
            {ticket ? `Chamado ${ticket.number}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="edit-title">Título</FieldLabel>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">Descrição</FieldLabel>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="field-sizing-fixed max-h-40 overflow-y-auto whitespace-pre-wrap break-words"
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
            <Button type="submit">Salvar alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
