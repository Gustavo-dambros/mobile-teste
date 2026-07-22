"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftIcon, PaperclipIcon } from "lucide-react"

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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function CriarChamadoPage() {
  const router = useRouter()
  const { createTicket } = useTickets()
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<TicketPriority>("Média")
  const [sector, setSector] = React.useState<TicketSector>("SP-Suporte Técnico")
  const [attachments, setAttachments] = React.useState<TicketAttachment[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
    setSubmitting(true)
    const ticket = await createTicket({
      title: title.trim(),
      description: description.trim(),
      priority,
      sector,
      attachments,
    })
    setSubmitting(false)
    if (!ticket) return
    toast.success("Chamado aberto com sucesso")
    revokeAttachmentUrls(attachments)
    router.push("/atendimentos")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Novo Chamado</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-24">
        <Field>
          <FieldLabel htmlFor="title">Título do chamado</FieldLabel>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Notebook não liga"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Descrição</FieldLabel>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o problema com o máximo de detalhes possível"
            rows={4}
            className="max-h-40 whitespace-pre-wrap break-words"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="priority">Prioridade</FieldLabel>
          <ComboSelect
            id="priority"
            value={priority}
            onValueChange={(value) => setPriority(value as TicketPriority)}
            options={priorityItems}
            placeholder="Selecione a prioridade"
            searchable={false}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="sector">Setor destino</FieldLabel>
          <SectorSelect
            id="sector"
            value={sector}
            onValueChange={(value) => setSector(value as TicketSector)}
          />
        </Field>

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
            <PaperclipIcon className="mr-2 h-4 w-4" />
            Anexar imagem, vídeo ou documento
          </Button>
          <AttachmentPreviewList
            attachments={attachments}
            onRemove={handleRemoveAttachment}
          />
        </Field>
      </form>

      <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-card p-4">
        <Button
          type="submit"
          className="w-full h-14 text-base font-semibold"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Enviando..." : "Iniciar Atendimento"}
        </Button>
      </div>
    </div>
  )
}
