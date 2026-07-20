"use client"

import * as React from "react"
import { toast } from "sonner"
import { FileTextIcon, StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  TASK_PRIORITY_CONFIG,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER,
} from "@/lib/atividades-setor/constants"
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
  RecurrenceRule,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/components/atividades-setor/types"
import { AttachmentPreviewList } from "@/components/atividades-setor/AttachmentPreviewList"
import { RecurrenceEditor } from "@/components/atividades-setor/RecurrenceEditor"
import { TagInput } from "@/components/atividades-setor/TagInput"
import { UserMultiSelect } from "@/components/atividades-setor/UserMultiSelect"
import { ComboSelect } from "@/components/combo-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

const PRIORITY_ITEMS = TASK_PRIORITY_ORDER.map((value) => ({
  value,
  label: TASK_PRIORITY_CONFIG[value].label,
}))
const STATUS_ITEMS = TASK_STATUS_ORDER.map((value) => ({
  value,
  label: TASK_STATUS_CONFIG[value].label,
}))

interface FormState {
  title: string
  description: string
  sector: string
  assigneeId: string | null
  eventId: string
  startDate: string
  dueDate: string
  dueTime: string
  priority: TaskPriority
  status: TaskStatus
  category: string
  tags: string[]
  watcherIds: string[]
  isPriority: boolean
  notifyAssignee: boolean
  attachments: ActivityAttachment[]
  recurrence: RecurrenceRule | undefined
}

function blankState(sector: string, status: TaskStatus = "pendente"): FormState {
  return {
    title: "",
    description: "",
    sector,
    assigneeId: null,
    eventId: "",
    startDate: "",
    dueDate: "",
    dueTime: "",
    priority: "media",
    status,
    category: "",
    tags: [],
    watcherIds: [],
    isPriority: false,
    notifyAssignee: true,
    attachments: [],
    recurrence: undefined,
  }
}

function stateFromTask(task: Task): FormState {
  return {
    title: task.title,
    description: task.description,
    sector: task.sector,
    assigneeId: task.assigneeId,
    eventId: task.eventId,
    startDate: task.startDate ?? "",
    dueDate: task.dueDate ?? "",
    dueTime: task.dueTime ?? "",
    priority: task.priority,
    status: task.status,
    category: task.category ?? "",
    tags: task.tags,
    watcherIds: task.watcherIds,
    isPriority: task.isPriority,
    notifyAssignee: false,
    attachments: task.attachments,
    recurrence: task.recurrence,
  }
}

export function TaskFormDrawer({
  open,
  onOpenChange,
  task,
  initialSector,
  initialStatus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  initialSector?: string
  initialStatus?: TaskStatus
}) {
  const { role, managedSectorsForCurrentUser, currentUserSector, currentUserId, sectors, createTask, updateTask } =
    useAtividadesSetor()
  const roster = useChatRoster()
  const allowedSectors =
    role === "admin"
      ? sectors
      : Array.from(
          new Set([...managedSectorsForCurrentUser, task?.sector ?? initialSector ?? currentUserSector])
        )
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const dialogKey = !open
    ? null
    : task
      ? `edit:${task.id}`
      : `create:${initialSector ?? ""}:${initialStatus ?? ""}`
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(() =>
    blankState(initialSector ?? allowedSectors[0] ?? "", initialStatus)
  )

  if (open && dialogKey !== loadedKey) {
    setLoadedKey(dialogKey)
    setForm(
      task
        ? stateFromTask(task)
        : blankState(initialSector ?? allowedSectors[0] ?? "", initialStatus)
    )
  }

  const me =
    currentUserSector === form.sector
      ? [{ id: currentUserId, name: "Você", sector: currentUserSector, email: "", phone: "" }]
      : []
  const sectorMembers = [...me, ...roster.filter((m) => m.sector === form.sector)]
  const responsibleOptions = sectorMembers.map((m) => ({ label: m.name, value: m.id }))
  const watcherOptions = sectorMembers.filter((m) => m.id !== form.assigneeId)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error("Informe o título da tarefa")
      return
    }
    if (!form.sector) {
      toast.error("Selecione o setor")
      return
    }
    if (!form.assigneeId) {
      toast.error("Selecione o responsável")
      return
    }
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      toast.error("A data limite não pode ser anterior à data de início")
      return
    }

    const input = {
      title: form.title.trim(),
      description: form.description.trim(),
      sector: form.sector,
      assigneeId: form.assigneeId,
      eventId: form.eventId,
      startDate: form.startDate || undefined,
      dueDate: form.dueDate || undefined,
      dueTime: form.dueTime || undefined,
      priority: form.priority,
      status: form.status,
      category: form.category.trim() || undefined,
      tags: form.tags,
      watcherIds: form.watcherIds,
      isPriority: form.isPriority,
      notifyAssignee: form.notifyAssignee,
      attachments: form.attachments,
      recurrence: form.recurrence,
    }

    const result = task ? await updateTask(task.id, input) : await createTask(input)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a tarefa")
      return
    }
    toast.success(task ? "Tarefa atualizada com sucesso" : "Tarefa criada com sucesso")
    handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{task ? "Editar tarefa" : "Nova tarefa"}</SheetTitle>
          <SheetDescription>
            {task ? `Tarefa ${task.number}` : "Atribua uma atividade a um responsável do setor."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
          <Field>
            <FieldLabel htmlFor="task-title">Título</FieldLabel>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Ex: Preparar relatório mensal"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="task-description">Descrição</FieldLabel>
            <Textarea
              id="task-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Descreva o que precisa ser feito"
              rows={4}
              className="field-sizing-fixed max-h-40 overflow-y-auto"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="task-sector">Setor</FieldLabel>
              <Select
                value={form.sector}
                onValueChange={(v) => {
                  if (!v) return
                  update("sector", v)
                  update("assigneeId", null)
                  update("watcherIds", [])
                }}
                items={allowedSectors.map((s) => ({ value: s, label: s }))}
              >
                <SelectTrigger id="task-sector" className="w-full">
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
              <FieldLabel htmlFor="task-assignee">Responsável</FieldLabel>
              <ComboSelect
                id="task-assignee"
                value={form.assigneeId ?? ""}
                onValueChange={(v) => update("assigneeId", v)}
                options={responsibleOptions}
                placeholder="Selecione o responsável"
                searchPlaceholder="Buscar pessoa..."
                emptyLabel="Nenhum usuário neste setor."
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="task-start-date">Data de início</FieldLabel>
              <Input
                id="task-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-due-date">Data limite</FieldLabel>
              <Input
                id="task-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="task-due-time">Horário do prazo</FieldLabel>
            <Input
              id="task-due-time"
              type="time"
              value={form.dueTime}
              onChange={(e) => update("dueTime", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="task-priority">Prioridade</FieldLabel>
              <Select
                value={form.priority}
                onValueChange={(v) => update("priority", v as TaskPriority)}
                items={PRIORITY_ITEMS}
              >
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PRIORITY_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="task-status">Status inicial</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v as TaskStatus)}
                items={STATUS_ITEMS}
              >
                <SelectTrigger id="task-status" className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="task-category">Categoria</FieldLabel>
            <Input
              id="task-category"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              placeholder="Ex: Financeiro, Documentação..."
            />
          </Field>

          <Field>
            <FieldLabel>Tags</FieldLabel>
            <TagInput value={form.tags} onChange={(tags) => update("tags", tags)} />
          </Field>

          <Field>
            <FieldLabel>Observadores / participantes</FieldLabel>
            <UserMultiSelect
              value={form.watcherIds}
              onChange={(ids) => update("watcherIds", ids)}
              options={watcherOptions}
              placeholder="Quem mais deve acompanhar esta tarefa"
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
          </Field>

          <label
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm",
              form.isPriority && "border-primary/30 bg-primary/5"
            )}
          >
            <Checkbox
              checked={form.isPriority}
              onCheckedChange={(checked) => update("isPriority", checked === true)}
            />
            <span className="flex items-center gap-1.5">
              <StarIcon className="size-4" />
              Marcar como tarefa prioritária
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={form.notifyAssignee}
              onCheckedChange={(checked) => update("notifyAssignee", checked === true)}
            />
            Notificar o responsável sobre esta tarefa
          </label>

          <SheetFooter className="flex-row justify-end gap-2 border-t px-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{task ? "Salvar alterações" : "Criar tarefa"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
