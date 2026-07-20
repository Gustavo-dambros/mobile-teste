"use client"

import * as React from "react"
import { toast } from "sonner"

import type { TicketMessage } from "@/components/tickets/types"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const reportReasons = [
  { label: "Conteúdo ofensivo", value: "Conteúdo ofensivo" },
  { label: "Spam", value: "Spam" },
  { label: "Informação incorreta", value: "Informação incorreta" },
  { label: "Outro", value: "Outro" },
]

export function ReportMessageDialog({
  message,
  onOpenChange,
}: {
  message: TicketMessage | null
  onOpenChange: (open: boolean) => void
}) {
  const { reportMessage } = useTickets()
  const [reason, setReason] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [loadedMessageId, setLoadedMessageId] = React.useState<string | null>(null)

  if (message && message.id !== loadedMessageId) {
    setLoadedMessageId(message.id)
    setReason("")
    setDescription("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message) return
    if (!reason) {
      toast.error("Selecione o motivo da denúncia")
      return
    }
    reportMessage(message.ticketId, message.id, reason, description.trim() || undefined)
    toast.success("Denúncia registrada para análise")
    onOpenChange(false)
  }

  return (
    <Dialog open={!!message} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Denunciar mensagem</DialogTitle>
          <DialogDescription>
            Sua denúncia será enviada para análise do administrador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="report-reason">Motivo da denúncia</FieldLabel>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value ?? "")}
              items={reportReasons}
            >
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {reportReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="report-description">
              Descrição (opcional)
            </FieldLabel>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione mais detalhes, se quiser"
              rows={3}
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
            <Button type="submit">Enviar denúncia</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
