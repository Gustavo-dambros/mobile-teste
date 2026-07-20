"use client"

import * as React from "react"
import { toast } from "sonner"
import { CalendarIcon, FileTextIcon, ImageIcon, VideoIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { useAnnouncements } from "@/lib/announcements/store"
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_PHOTO_TYPES,
  ACCEPTED_VIDEO_TYPES,
  filesToAttachments,
  revokeAttachmentUrls,
  uploadAttachments,
} from "@/lib/announcements/upload"
import type {
  AnnouncementAttachment,
  AnnouncementType,
  RecipientSelection,
} from "@/components/announcements/types"
import { AttachmentPreviewList } from "@/components/announcements/AttachmentPreviewList"
import { RecipientSelect } from "@/components/announcements/RecipientSelect"
import { ComboSelect } from "@/components/combo-select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const EMPTY_RECIPIENTS: RecipientSelection = { mode: "all", sectorIds: [], userIds: [] }

function toDisplayDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function AnnouncementFormDialog() {
  const {
    isFormDialogOpen,
    formMode,
    formInitialDate,
    editingAnnouncementId,
    closeFormDialog,
    getAnnouncement,
    createAnnouncement,
    updateAnnouncement,
  } = useAnnouncements()
  const roster = useChatRoster()
  const responsibleOptions = React.useMemo(
    () => roster.map((m) => ({ label: `${m.name} — ${m.sector}`, value: m.id })),
    [roster]
  )

  const [type, setType] = React.useState<AnnouncementType>("Anúncio")
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [date, setDate] = React.useState("")
  const [dateOpen, setDateOpen] = React.useState(false)
  const [time, setTime] = React.useState("")
  const [responsibleId, setResponsibleId] = React.useState<string | null>(null)
  const [attachments, setAttachments] = React.useState<AnnouncementAttachment[]>([])
  const [recipients, setRecipients] = React.useState<RecipientSelection>(EMPTY_RECIPIENTS)
  const [submitting, setSubmitting] = React.useState(false)

  // Attachment ids picked in this session that still need a real upload —
  // attachments loaded from an existing announcement (editing) already have
  // a real signed URL and are never in this map.
  const pendingFilesRef = React.useRef<Map<string, File>>(new Map())

  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)
  const documentInputRef = React.useRef<HTMLInputElement>(null)

  // Loads the edited announcement (or resets to a blank form) exactly once
  // per open transition — adjusting state during render instead of an
  // effect avoids an extra render pass for what is otherwise a plain sync.
  const dialogKey = !isFormDialogOpen
    ? null
    : formMode === "edit" && editingAnnouncementId
      ? `edit:${editingAnnouncementId}`
      : `create:${formInitialDate ?? ""}`
  const [loadedDialogKey, setLoadedDialogKey] = React.useState<string | null>(null)

  if (isFormDialogOpen && dialogKey !== loadedDialogKey) {
    setLoadedDialogKey(dialogKey)
    pendingFilesRef.current.clear()
    if (formMode === "edit" && editingAnnouncementId) {
      const existing = getAnnouncement(editingAnnouncementId)
      if (existing) {
        setType(existing.type)
        setTitle(existing.title)
        setDescription(existing.description)
        setDate(existing.date)
        setTime(existing.time)
        setResponsibleId(existing.responsibleId)
        setAttachments(existing.attachments)
        setRecipients(existing.recipients)
      }
    } else {
      setType("Anúncio")
      setTitle("")
      setDescription("")
      setDate(formInitialDate ?? "")
      setTime("")
      setResponsibleId(null)
      setAttachments([])
      setRecipients(EMPTY_RECIPIENTS)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) closeFormDialog()
  }

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) {
      const previews = filesToAttachments(picked)
      previews.forEach((preview, i) => pendingFilesRef.current.set(preview.id, picked[i]))
      setAttachments((prev) => [...prev, ...previews])
    }
    e.target.value = ""
  }

  function handleRemoveAttachment(id: string) {
    pendingFilesRef.current.delete(id)
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id)
      if (found) revokeAttachmentUrls([found])
      return prev.filter((a) => a.id !== id)
    })
  }

  function resolvedRecipientCount() {
    if (recipients.mode === "all") return roster.length
    if (recipients.mode === "sectors") {
      return roster.filter((m) => recipients.sectorIds.includes(m.sector)).length
    }
    return recipients.userIds.length
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Informe o título do anúncio ou evento")
      return
    }
    if (!date) {
      toast.error("Selecione a data")
      return
    }
    if (!time) {
      toast.error("Informe o horário")
      return
    }
    if (!responsibleId) {
      toast.error("Selecione o responsável")
      return
    }
    if (resolvedRecipientCount() === 0) {
      toast.error("Selecione pelo menos um destinatário")
      return
    }

    setSubmitting(true)
    let finalAttachments = attachments
    const pending = attachments.filter((a) => pendingFilesRef.current.has(a.id))
    if (pending.length > 0) {
      try {
        const uploaded = await uploadAttachments(
          pending.map((a) => pendingFilesRef.current.get(a.id)!),
          pending.map((a) => a.id)
        )
        const uploadedById = new Map(uploaded.map((a) => [a.id, a]))
        finalAttachments = attachments.map((a) => uploadedById.get(a.id) ?? a)
      } catch (error) {
        setSubmitting(false)
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar os anexos")
        return
      }
    }

    const input = {
      type,
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      responsibleId,
      attachments: finalAttachments,
      recipients,
    }

    const result =
      formMode === "edit" && editingAnnouncementId
        ? await updateAnnouncement(editingAnnouncementId, input)
        : await createAnnouncement(input)
    setSubmitting(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar")
      return
    }
    toast.success(
      formMode === "edit"
        ? type === "Evento"
          ? "Evento atualizado com sucesso"
          : "Anúncio atualizado com sucesso"
        : type === "Evento"
          ? "Evento publicado com sucesso"
          : "Anúncio publicado com sucesso"
    )
    pendingFilesRef.current.clear()
    handleOpenChange(false)
  }

  return (
    <Dialog open={isFormDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {formMode === "edit" ? "Editar publicação" : "Novo anúncio ou evento"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo e escolha quem deve receber esta publicação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Tipo</FieldLabel>
            <Tabs value={type} onValueChange={(v) => setType(v as AnnouncementType)}>
              <TabsList className="w-full">
                <TabsTrigger value="Anúncio" className="flex-1">
                  Anúncio
                </TabsTrigger>
                <TabsTrigger value="Evento" className="flex-1">
                  Evento
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>

          <Field>
            <FieldLabel htmlFor="announcement-title">Título</FieldLabel>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião geral de alinhamento"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="announcement-description">Descrição</FieldLabel>
            <Textarea
              id="announcement-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes do anúncio ou evento"
              rows={4}
              className="field-sizing-fixed max-h-40 overflow-y-auto whitespace-pre-wrap break-words"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="announcement-date">Data</FieldLabel>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      id="announcement-date"
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                    />
                  }
                >
                  <CalendarIcon className="opacity-60" />
                  <span className={cn(!date && "text-muted-foreground")}>
                    {date ? toDisplayDate(date) : "Selecionar data"}
                  </span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(`${date}T00:00:00`) : undefined}
                    onSelect={(picked) => {
                      if (picked) setDate(toISODate(picked))
                      setDateOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field>
              <FieldLabel htmlFor="announcement-time">Horário</FieldLabel>
              <Input
                id="announcement-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="announcement-responsible">Responsável</FieldLabel>
            <ComboSelect
              id="announcement-responsible"
              value={responsibleId ?? ""}
              onValueChange={(v) => setResponsibleId(v)}
              options={responsibleOptions}
              placeholder="Selecione o responsável"
              searchPlaceholder="Buscar pessoa..."
            />
          </Field>

          <Field>
            <FieldLabel>Anexos</FieldLabel>
            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept={ACCEPTED_PHOTO_TYPES}
              onChange={handlePickFiles}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept={ACCEPTED_VIDEO_TYPES}
              onChange={handlePickFiles}
              className="hidden"
            />
            <input
              ref={documentInputRef}
              type="file"
              multiple
              accept={ACCEPTED_DOCUMENT_TYPES}
              onChange={handlePickFiles}
              className="hidden"
            />
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-center border-dashed"
                onClick={() => photoInputRef.current?.click()}
              >
                <ImageIcon data-icon="inline-start" />
                Fotos
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-center border-dashed"
                onClick={() => videoInputRef.current?.click()}
              >
                <VideoIcon data-icon="inline-start" />
                Vídeos
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-center border-dashed"
                onClick={() => documentInputRef.current?.click()}
              >
                <FileTextIcon data-icon="inline-start" />
                Documentos
              </Button>
            </div>
            <AttachmentPreviewList
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />
          </Field>

          <Field>
            <FieldLabel>Destinatários</FieldLabel>
            <RecipientSelect value={recipients} onChange={setRecipients} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {formMode === "edit" ? "Salvar alterações" : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
