"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  LinkIcon,
  MapPinIcon,
  PencilIcon,
  ShieldOffIcon,
  Trash2Icon,
} from "lucide-react"

import { getCalendarColor } from "@/lib/atividades-setor/colors"
import { canDeleteEvent, canEditEvent } from "@/lib/atividades-setor/permissions"
import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import { useCurrentUser } from "@/lib/current-user/context"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import type { Task, TaskStatus } from "@/components/atividades-setor/types"
import { ConfirmDialog } from "@/components/atividades-setor/ConfirmDialog"
import { EventFormDialog } from "@/components/atividades-setor/EventFormDialog"
import { KanbanBoard } from "@/components/atividades-setor/KanbanBoard"
import { BoardSkeleton, EmptyState } from "@/components/atividades-setor/StateViews"
import { TaskDetailSheet } from "@/components/atividades-setor/TaskDetailSheet"
import { TaskFormDrawer } from "@/components/atividades-setor/TaskFormDrawer"
import { UserAvatarBadge } from "@/components/atividades-setor/UserAvatarBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Separator } from "@/components/ui/separator"

function ActivityDetailPageInner({ eventId }: { eventId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { getEvent, visibleTasks, createTask, deleteEvent } = useAtividadesSetor()
  const currentUser = useCurrentUser()
  const roster = useChatRoster()

  const event = getEvent(eventId)

  const [addingStatus, setAddingStatus] = React.useState<TaskStatus | null>(null)
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const [newTaskAssigneeId, setNewTaskAssigneeId] = React.useState<string | null>(null)

  const [detailTaskId, setDetailTaskId] = React.useState<string | null>(
    searchParams.get("task")
  )
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const [taskFormOpen, setTaskFormOpen] = React.useState(false)
  const [deletingTask, setDeletingTask] = React.useState<Task | null>(null)
  const [hardDeleteStep, setHardDeleteStep] = React.useState<0 | 1 | 2>(0)
  const [hardDeleteTarget, setHardDeleteTarget] = React.useState<Task | null>(null)

  const [editFormOpen, setEditFormOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

  function goBack() {
    router.push("/atividades-setor")
  }

  if (!event) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldOffIcon className="size-6 text-muted-foreground" />
        <h3 className="text-sm font-medium">Atividade não encontrada</h3>
        <p className="text-sm text-muted-foreground">
          Ela pode ter sido excluída, ou você não foi atribuído a ela.
        </p>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Voltar às atividades
        </Button>
      </div>
    )
  }

  // Re-bound to a non-nullable const: TS only narrows `event` itself within
  // this function's own control flow, not inside the nested handlers below.
  const activeEvent = event

  const canEdit = !!currentUser && !event.deletedAt && canEditEvent(currentUser, event)
  const canDelete = !!currentUser && canDeleteEvent(currentUser, event)
  const color = event.color ?? getCalendarColor(event.creatorId)
  const tasks = visibleTasks.filter((t) => t.eventId === event.id)
  const nameFor = (id: string) => (id === currentUser?.id ? "Você" : (roster.find((m) => m.id === id)?.name ?? id))
  const assigneeOptions = (
    activeEvent.participantIds.length > 0 ? activeEvent.participantIds : [activeEvent.creatorId]
  ).map((id) => ({ id, name: nameFor(id) }))

  function openAddTask(status: TaskStatus) {
    setAddingStatus(status)
    setNewTaskTitle("")
    setNewTaskAssigneeId(assigneeOptions[0]?.id ?? null)
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title) {
      toast.error("Informe o título da tarefa")
      return
    }
    const assigneeId = newTaskAssigneeId ?? activeEvent.creatorId
    const result = await createTask({
      title,
      description: "",
      sector: activeEvent.sector,
      assigneeId,
      eventId: activeEvent.id,
      dueDate: activeEvent.date,
      dueTime: activeEvent.startTime,
      priority: "media",
      status: addingStatus ?? "pendente",
      tags: [],
      watcherIds: activeEvent.participantIds.filter((id) => id !== assigneeId),
      isPriority: false,
      notifyAssignee: true,
      attachments: [],
    })
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível criar a tarefa")
      return
    }
    toast.success("Tarefa adicionada")
    setAddingStatus(null)
  }

  async function handleConfirmDelete() {
    const result = await deleteEvent(activeEvent.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir a atividade")
      setDeleteConfirmOpen(false)
      return
    }
    toast.success("Atividade excluída")
    goBack()
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <Button variant="ghost" size="sm" className="w-fit" onClick={goBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Atividades do setor
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" style={{ borderColor: `${color}80`, color }} className="bg-transparent">
            <span className="mr-1 size-1.5 rounded-full" style={{ backgroundColor: color }} />
            {event.sector}
          </Badge>
          {event.cancelledAt && <Badge variant="destructive">Cancelado</Badge>}
          {event.deletedAt && <Badge variant="destructive">Excluído</Badge>}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {event.description || "Sem descrição."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditFormOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2Icon data-icon="inline-start" />
                Excluir
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:max-w-md">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span>
              {new Date(`${event.date}T00:00:00`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            <span>
              {event.allDay
                ? "Dia inteiro"
                : `${event.startTime ?? "—"}${event.endTime ? ` às ${event.endTime}` : ""}`}
            </span>
          </div>
          {event.location && (
            <div className="col-span-2 flex items-center gap-2">
              <MapPinIcon className="size-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          {event.meetingLink && (
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="col-span-2 flex items-center gap-2 text-primary hover:underline"
            >
              <LinkIcon className="size-4" />
              <span className="truncate">{event.meetingLink}</span>
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Criador</span>
            <UserAvatarBadge userId={event.creatorId} size="sm" showName />
          </div>
          {event.participantIds.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Colaboradores responsáveis</span>
              <div className="flex flex-wrap gap-2">
                {event.participantIds.map((id) => (
                  <UserAvatarBadge key={id} userId={id} size="sm" showName />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <span className="px-4 text-sm font-medium lg:px-6">Quadro da atividade</span>
        {tasks.length === 0 && !canEdit ? (
          <div className="px-4 lg:px-6">
            <EmptyState title="Nenhuma tarefa ainda" description="Aguarde o responsável adicionar tarefas." />
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onCardClick={setDetailTaskId}
            onCreateInSector={openAddTask}
            canCreate={canEdit}
          />
        )}
      </div>

      <Dialog open={addingStatus !== null} onOpenChange={(open) => !open && setAddingStatus(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="new-task-title">Título</FieldLabel>
              <Input
                id="new-task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTask()
                  }
                }}
                placeholder="Ex: Falar sobre investimentos"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-task-assignee">Responsável</FieldLabel>
              <Select
                value={newTaskAssigneeId ?? ""}
                onValueChange={(v) => v && setNewTaskAssigneeId(v)}
                items={assigneeOptions.map((m) => ({ value: m.id, label: m.name }))}
              >
                <SelectTrigger id="new-task-assignee" className="w-full">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {assigneeOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddingStatus(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddTask}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailSheet
        taskId={detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        onEdit={(task) => {
          setDetailTaskId(null)
          setEditingTask(task)
          setTaskFormOpen(true)
        }}
        onRequestDelete={(task) => setDeletingTask(task)}
        onRequestHardDelete={(task) => {
          setHardDeleteTarget(task)
          setHardDeleteStep(1)
        }}
      />
      <TaskFormDrawer open={taskFormOpen} onOpenChange={setTaskFormOpen} task={editingTask} />
      <EventFormDialog open={editFormOpen} onOpenChange={setEditFormOpen} event={event} />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir atividade"
        description="Tem certeza de que deseja excluir esta atividade? Todos os colaboradores atribuídos deixarão de vê-la, junto com suas tarefas."
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
      />
      <ConfirmDialogForTask
        deletingTask={deletingTask}
        onOpenChange={() => setDeletingTask(null)}
        hardDeleteStep={hardDeleteStep}
        onHardDeleteStepChange={setHardDeleteStep}
        hardDeleteTarget={hardDeleteTarget}
        onAfterDelete={() => setDetailTaskId(null)}
      />
    </div>
  )
}

/**
 * Bundles the task delete / hard-delete confirmation steps used both here
 * and on the main calendar page — kept local since it's only ever wired up
 * exactly this one way (delete -> optional two-step hard delete).
 */
function ConfirmDialogForTask({
  deletingTask,
  onOpenChange,
  hardDeleteStep,
  onHardDeleteStepChange,
  hardDeleteTarget,
  onAfterDelete,
}: {
  deletingTask: Task | null
  onOpenChange: () => void
  hardDeleteStep: 0 | 1 | 2
  onHardDeleteStepChange: (step: 0 | 1 | 2) => void
  hardDeleteTarget: Task | null
  onAfterDelete: () => void
}) {
  const { deleteTask, hardDeleteTask } = useAtividadesSetor()

  async function handleConfirmDeleteTask() {
    if (!deletingTask) return
    const result = await deleteTask(deletingTask.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir a tarefa")
      onOpenChange()
      return
    }
    toast.success("Tarefa excluída")
    onOpenChange()
    onAfterDelete()
  }

  async function handleHardDeleteFinal() {
    if (!hardDeleteTarget) return
    const result = await hardDeleteTask(hardDeleteTarget.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir definitivamente")
    } else {
      toast.success("Tarefa excluída definitivamente")
    }
    onHardDeleteStepChange(0)
    onAfterDelete()
  }

  return (
    <>
      <ConfirmDialog
        open={!!deletingTask}
        onOpenChange={(open) => !open && onOpenChange()}
        title="Excluir tarefa"
        description="Tem certeza de que deseja excluir esta tarefa? Ela será movida para a lixeira e poderá ser restaurada por um administrador."
        confirmLabel="Excluir"
        onConfirm={handleConfirmDeleteTask}
      />
      <ConfirmDialog
        open={hardDeleteStep === 1}
        onOpenChange={(open) => !open && onHardDeleteStepChange(0)}
        title="Excluir definitivamente"
        description="Esta ação remove a tarefa e todo o seu histórico permanentemente. Deseja continuar?"
        confirmLabel="Continuar"
        onConfirm={() => onHardDeleteStepChange(2)}
      />
      <ConfirmDialog
        open={hardDeleteStep === 2}
        onOpenChange={(open) => !open && onHardDeleteStepChange(0)}
        title="Confirmar exclusão definitiva"
        description="Esta é a confirmação final. A tarefa não poderá ser recuperada de forma alguma. Confirma a exclusão definitiva?"
        confirmLabel="Excluir definitivamente"
        onConfirm={handleHardDeleteFinal}
      />
    </>
  )
}

/**
 * Full page for a single activity — mirrors how a chamado opens its own
 * route instead of a slide-over, since the Kanban board needs the room.
 * Reached by clicking an activity on the calendar or the day list.
 */
export function ActivityDetailPage({ eventId }: { eventId: string }) {
  return (
    <React.Suspense fallback={<BoardSkeleton />}>
      <ActivityDetailPageInner eventId={eventId} />
    </React.Suspense>
  )
}
