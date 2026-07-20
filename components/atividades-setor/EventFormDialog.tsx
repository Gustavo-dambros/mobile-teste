"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { CALENDAR_COLOR_PALETTE } from "@/lib/atividades-setor/colors"
import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import {
  ACCEPTED_ATTACHMENT_TYPES,
  filesToAttachments,
  revokeAttachmentUrls,
  validateFile,
} from "@/lib/atividades-setor/upload"
import type {
  ActivityAttachment,
  CalendarEvent,
  RecurrenceRule,
} from "@/components/atividades-setor/types"
import { AttachmentPreviewList } from "@/components/atividades-setor/AttachmentPreviewList"
import { RecurrenceEditor } from "@/components/atividades-setor/RecurrenceEditor"
import { TagInput } from "@/components/atividades-setor/TagInput"
import { UserMultiSelect } from "@/components/atividades-setor/UserMultiSelect"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const REMINDER_PRESETS = [
  { offsetMinutes: 10, label: "10 minutos antes" },
  { offsetMinutes: 30, label: "30 minutos antes" },
  { offsetMinutes: 60, label: "1 hora antes" },
  { offsetMinutes: 1440, label: "1 dia antes" },
]

const COLOR_SWATCHES = CALENDAR_COLOR_PALETTE

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

interface ChecklistItem {
  id: string
  title: string
  assigneeId: string | null
}

interface FormState {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  allDay: boolean
  location: string
  meetingLink: string
  sector: string
  participantIds: string[]
  color: string | undefined
  category: string
  tags: string[]
  attachments: ActivityAttachment[]
  recurrence: RecurrenceRule | undefined
  reminderOffsets: number[]
  checklist: ChecklistItem[]
}

function blankState(sector: string, date?: string): FormState {
  return {
    title: "",
    description: "",
    date: date ?? "",
    startTime: "",
    endTime: "",
    allDay: false,
    location: "",
    meetingLink: "",
    sector,
    participantIds: [],
    color: undefined,
    category: "",
    tags: [],
    attachments: [],
    recurrence: undefined,
    reminderOffsets: [60],
    checklist: [],
  }
}

function stateFromEvent(event: CalendarEvent): FormState {
  return {
    title: event.title,
    description: event.description,
    date: event.date,
    startTime: event.startTime ?? "",
    endTime: event.endTime ?? "",
    allDay: event.allDay,
    location: event.location ?? "",
    meetingLink: event.meetingLink ?? "",
    sector: event.sector,
    participantIds: event.participantIds,
    color: event.color,
    category: event.category ?? "",
    tags: event.tags,
    attachments: event.attachments,
    recurrence: event.recurrence,
    reminderOffsets: event.reminders.map((r) => r.offsetMinutes),
    checklist: [],
  }
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  initialDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  initialDate?: string
}) {
  const { role, managedSectorsForCurrentUser, currentUserSector, currentUserId, sectors, createEvent, updateEvent, createTask } =
    useAtividadesSetor()
  const roster = useChatRoster()
  const [dateOpen, setDateOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [checklistDraft, setChecklistDraft] = React.useState("")
  const [showMoreOptions, setShowMoreOptions] = React.useState(false)

  const allowedSectors =
    role === "admin" ? sectors : role === "gestor" ? managedSectorsForCurrentUser : [currentUserSector]

  const dialogKey = !open ? null : event ? `edit:${event.id}` : `create:${initialDate ?? ""}`
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(() =>
    blankState(currentUserSector, initialDate)
  )

  if (open && dialogKey !== loadedKey) {
    setLoadedKey(dialogKey)
    setForm(
      event
        ? stateFromEvent(event)
        : blankState(allowedSectors[0] ?? currentUserSector, initialDate)
    )
    setChecklistDraft("")
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleOpenChange(next: boolean) {
    if (!next) onOpenChange(false)
  }

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    for (const file of picked) {
      const error = validateFile(file)
      if (error) {
        toast.error(error)
        e.target.value = ""
        return
      }
    }
    if (picked.length) {
      update("attachments", [...form.attachments, ...filesToAttachments(picked)])
    }
    e.target.value = ""
  }

  function handleRemoveAttachment(id: string) {
    const found = form.attachments.find((a) => a.id === id)
    if (found) revokeAttachmentUrls([found])
    update(
      "attachments",
      form.attachments.filter((a) => a.id !== id)
    )
  }

  function addChecklistItem() {
    const title = checklistDraft.trim()
    if (!title) return
    update("checklist", [
      ...form.checklist,
      { id: crypto.randomUUID(), title, assigneeId: form.participantIds[0] ?? null },
    ])
    setChecklistDraft("")
  }

  function updateChecklistItem(id: string, changes: Partial<ChecklistItem>) {
    update(
      "checklist",
      form.checklist.map((item) => (item.id === id ? { ...item, ...changes } : item))
    )
  }

  function removeChecklistItem(id: string) {
    update(
      "checklist",
      form.checklist.filter((item) => item.id !== id)
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error("Informe o título da atividade")
      return
    }
    if (!form.date) {
      toast.error("Selecione a data da atividade")
      return
    }
    if (!form.allDay && !form.startTime) {
      toast.error("Informe o horário inicial")
      return
    }
    if (form.startTime && form.endTime && form.endTime < form.startTime) {
      toast.error("O horário final não pode ser anterior ao horário inicial")
      return
    }

    const input = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      startTime: form.allDay ? undefined : form.startTime || undefined,
      endTime: form.allDay ? undefined : form.endTime || undefined,
      allDay: form.allDay,
      location: form.location.trim() || undefined,
      meetingLink: form.meetingLink.trim() || undefined,
      sector: form.sector,
      participantIds: form.participantIds,
      invitedUserIds: [],
      invitedSectorIds: [],
      visibility: "participantes" as const,
      color: form.color,
      category: form.category.trim() || undefined,
      tags: form.tags,
      attachments: form.attachments,
      recurrence: form.recurrence,
      reminders: form.reminderOffsets.map((offsetMinutes) => ({ offsetMinutes })),
    }

    if (event) {
      const result = await updateEvent(event.id, input)
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar a atividade")
        return
      }
      toast.success("Atividade atualizada com sucesso")
      handleOpenChange(false)
      return
    }

    const result = await createEvent(input)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a atividade")
      return
    }
    toast.success("Atividade criada com sucesso")

    if (result.event) {
      const createdEvent = result.event
      for (const item of form.checklist) {
        const assigneeId = item.assigneeId ?? form.participantIds[0] ?? currentUserId
        await createTask({
          title: item.title,
          description: "",
          sector: form.sector,
          assigneeId,
          eventId: createdEvent.id,
          dueDate: form.date,
          dueTime: form.allDay ? undefined : form.startTime || undefined,
          priority: "media",
          status: "pendente",
          tags: [],
          watcherIds: form.participantIds.filter((id) => id !== assigneeId),
          isPriority: false,
          notifyAssignee: true,
          attachments: [],
        })
      }
    }

    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{event ? "Editar atividade" : "Nova atividade"}</DialogTitle>
          <DialogDescription>
            Registre uma atividade, escolha quem participa e liste as tarefas que compõem ela.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="event-title">Título</FieldLabel>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Ex: Reunião de alinhamento"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="event-description">Descrição</FieldLabel>
            <Textarea
              id="event-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="field-sizing-fixed max-h-32 overflow-y-auto"
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={form.allDay}
              onCheckedChange={(checked) => update("allDay", checked === true)}
            />
            Atividade de dia inteiro
          </label>

          <div className="grid grid-cols-3 gap-4">
            <Field className="col-span-3 sm:col-span-1">
              <FieldLabel htmlFor="event-date">Data</FieldLabel>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      id="event-date"
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                    />
                  }
                >
                  <CalendarIcon className="opacity-60" />
                  <span className={cn(!form.date && "text-muted-foreground")}>
                    {form.date ? toDisplayDate(form.date) : "Selecionar"}
                  </span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.date ? new Date(`${form.date}T00:00:00`) : undefined}
                    onSelect={(picked) => {
                      if (picked) update("date", toISODate(picked))
                      setDateOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </Field>
            {!form.allDay && (
              <>
                <Field>
                  <FieldLabel htmlFor="event-start-time">Início</FieldLabel>
                  <Input
                    id="event-start-time"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-end-time">Fim</FieldLabel>
                  <Input
                    id="event-end-time"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>

          <Field>
            <FieldLabel htmlFor="event-sector">Setor</FieldLabel>
            <Select
              value={form.sector}
              onValueChange={(v) => v && update("sector", v)}
              items={allowedSectors.map((s) => ({ value: s, label: s }))}
              disabled={allowedSectors.length <= 1}
            >
              <SelectTrigger id="event-sector" className="w-full">
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {allowedSectors.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Colaboradores responsáveis</FieldLabel>
            <UserMultiSelect
              value={form.participantIds}
              onChange={(ids) => update("participantIds", ids)}
              options={roster}
              placeholder="Selecionar colaboradores de qualquer setor"
            />
            <p className="text-xs text-muted-foreground">
              Só os colaboradores selecionados aqui (e você) vão enxergar esta atividade.
            </p>
          </Field>

          <Field>
            <FieldLabel>Tarefas da atividade</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={checklistDraft}
                onChange={(e) => setChecklistDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addChecklistItem()
                  }
                }}
                placeholder="Ex: Falar sobre inglês"
              />
              <Button type="button" variant="outline" size="icon" onClick={addChecklistItem}>
                <PlusIcon />
                <span className="sr-only">Adicionar tarefa</span>
              </Button>
            </div>
            {form.checklist.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {form.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-sm"
                  >
                    <span className="flex-1 truncate">{item.title}</span>
                    <Select
                      value={item.assigneeId ?? ""}
                      onValueChange={(v) => updateChecklistItem(item.id, { assigneeId: v || null })}
                      items={form.participantIds.map((id) => ({
                        value: id,
                        label: (id === currentUserId ? "Você" : roster.find((m) => m.id === id)?.name) ?? id,
                      }))}
                    >
                      <SelectTrigger size="sm" className="w-40">
                        <SelectValue placeholder="Responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {form.participantIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              {(id === currentUserId ? "Você" : roster.find((m) => m.id === id)?.name) ?? id}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeChecklistItem(item.id)}
                    >
                      <XIcon className="size-3.5" />
                      <span className="sr-only">Remover {item.title}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {event && (
              <p className="text-xs text-muted-foreground">
                Para adicionar tarefas a uma atividade já existente, abra o quadro Kanban dela.
              </p>
            )}
          </Field>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setShowMoreOptions((v) => !v)}
          >
            {showMoreOptions ? (
              <>
                <ChevronUpIcon data-icon="inline-start" />
                Menos opções
              </>
            ) : (
              <>
                <ChevronDownIcon data-icon="inline-start" />
                Mais opções (local, link, cor, tags, lembretes, anexos, recorrência)
              </>
            )}
          </Button>

          {showMoreOptions && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="event-location">Local</FieldLabel>
                  <Input
                    id="event-location"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="Ex: Sala de reuniões"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-link">Link da reunião</FieldLabel>
                  <Input
                    id="event-link"
                    value={form.meetingLink}
                    onChange={(e) => update("meetingLink", e.target.value)}
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="event-category">Categoria</FieldLabel>
                <Input
                  id="event-category"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>Tags</FieldLabel>
                <TagInput value={form.tags} onChange={(tags) => update("tags", tags)} />
              </Field>

              <Field>
                <FieldLabel>Cor personalizada</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => update("color", undefined)}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border text-muted-foreground",
                      !form.color && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                    )}
                  >
                    <XIcon className="size-3.5" />
                    <span className="sr-only">Usar cor padrão</span>
                  </button>
                  {COLOR_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update("color", color)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full",
                        form.color === color && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {form.color === color && <CheckIcon className="size-3.5 text-white" />}
                      <span className="sr-only">Selecionar cor {color}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field>
                <FieldLabel>Lembretes</FieldLabel>
                <div className="flex flex-col gap-1.5">
                  {REMINDER_PRESETS.map((preset) => (
                    <label
                      key={preset.offsetMinutes}
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        checked={form.reminderOffsets.includes(preset.offsetMinutes)}
                        onCheckedChange={(checked) =>
                          update(
                            "reminderOffsets",
                            checked === true
                              ? [...form.reminderOffsets, preset.offsetMinutes]
                              : form.reminderOffsets.filter((o) => o !== preset.offsetMinutes)
                          )
                        }
                      />
                      {preset.label}
                    </label>
                  ))}
                </div>
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
                  <FileTextIcon data-icon="inline-start" />
                  Anexar arquivo
                </Button>
                <AttachmentPreviewList
                  attachments={form.attachments}
                  onRemove={handleRemoveAttachment}
                />
              </Field>

              <Field>
                <FieldLabel>Recorrência</FieldLabel>
                <RecurrenceEditor
                  value={form.recurrence}
                  onChange={(rule) => update("recurrence", rule)}
                />
                <p className="text-xs text-muted-foreground">
                  Escolha &quot;Semanalmente&quot; e use &quot;Marcar todos&quot; para fixar esta
                  atividade em todos os dias da semana.
                </p>
              </Field>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{event ? "Salvar alterações" : "Criar atividade"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
