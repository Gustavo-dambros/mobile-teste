"use client"

import * as React from "react"
import { toast } from "sonner"
import { PaperclipIcon } from "lucide-react"

import type {
  TicketAttachment,
  TicketPriority,
  TicketSector,
} from "@/components/tickets/types"
import { priorityItems } from "@/lib/tickets/mock-data"
import { useTickets } from "@/lib/tickets/store"
import {
  ACCEPTED_ATTACHMENT_TYPES,
  filesToAttachments,
  revokeAttachmentUrls,
} from "@/lib/tickets/upload"
import { AttachmentPreviewList } from "@/components/tickets/AttachmentPreviewList"
import { ComboSelect } from "@/components/combo-select"
import { SectorSelect } from "@/components/sector-select"
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

/**
 * Rendered once, globally (see app/(app)/layout.tsx), and opened from
 * anywhere in the app — the sidebar's "Criação Rápida" button and the
 * "Iniciar Atendimento" button on the tickets list both call
 * `openCreateDialog()` from the shared tickets store.
 */
export function CreateTicketDialog() {
  const { createTicket, isCreateDialogOpen, closeCreateDialog } = useTickets()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<TicketPriority>("Média")
  const [sector, setSector] = React.useState<TicketSector>("SP-Suporte Técnico")
  const [attachments, setAttachments] = React.useState<TicketAttachment[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function resetForm() {
    setTitle("")
    setDescription("")
    setPriority("Média")
    setSector("SP-Suporte Técnico")
    revokeAttachmentUrls(attachments)
    setAttachments([])
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      closeCreateDialog()
      resetForm()
    }
  }

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) {
      setAttachments((prev) => [...prev, ...filesToAttachments(picked)])
    }
    e.target.value = ""
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id)
      if (found) revokeAttachmentUrls([found])
      return prev.filter((a) => a.id !== id)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      toast.error("Preencha o título e a descrição do chamado")
      return
    }
    const ticket = await createTicket({
      title: title.trim(),
      description: description.trim(),
      priority,
      sector,
      attachments,
    })
    if (!ticket) return
    toast.success("Chamado aberto com sucesso")
    handleOpenChange(false)
  }

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Iniciar atendimento</DialogTitle>
          <DialogDescription>
            Descreva o problema para que o setor responsável possa te ajudar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="new-title">Título do chamado</FieldLabel>
            <Input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Notebook não liga"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-description">Descrição</FieldLabel>
            <Textarea
              id="new-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema com o máximo de detalhes possível"
              rows={4}
              className="field-sizing-fixed max-h-40 overflow-y-auto whitespace-pre-wrap break-words"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="new-priority">Prioridade</FieldLabel>
              <ComboSelect
                id="new-priority"
                value={priority}
                onValueChange={(value) => setPriority(value as TicketPriority)}
                options={priorityItems}
                placeholder="Selecione a prioridade"
                searchable={false}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-sector">Setor destino</FieldLabel>
              <SectorSelect
                id="new-sector"
                value={sector}
                onValueChange={(value) => setSector(value as TicketSector)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Anexos</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_ATTACHMENT_TYPES}
              onChange={handlePickFiles}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon data-icon="inline-start" />
              Anexar imagem, vídeo ou documento
            </Button>
            <AttachmentPreviewList
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Iniciar Atendimento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
