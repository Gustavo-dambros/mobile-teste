"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  MessageSquareIcon,
  PaperclipIcon,
  PlusIcon,
  StarIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { kanbanColumnIn } from "@/lib/motion"
import { cn } from "@/lib/utils"
import {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER,
} from "@/lib/atividades-setor/constants"
import { computeOverdue } from "@/lib/atividades-setor/overdue"
import { canChangeTaskStatus } from "@/lib/atividades-setor/permissions"
import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import { useCurrentUser } from "@/lib/current-user/context"
import type { Task, TaskStatus } from "@/components/atividades-setor/types"
import { EmptyState } from "@/components/atividades-setor/StateViews"
import { UserAvatarBadge } from "@/components/atividades-setor/UserAvatarBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function KanbanCardBody({ task }: { task: Task }) {
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority]
  const { overdue, days } = computeOverdue(task)

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-medium">{task.title}</span>
        {task.isPriority && <StarIcon className="size-3.5 shrink-0 text-amber-500" />}
      </div>
      {task.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
          {priorityConfig.label}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {task.sector}
        </Badge>
        {overdue && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <TriangleAlertIcon className="size-3" />
            {days}d atraso
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-between pt-1">
        <UserAvatarBadge userId={task.assigneeId} size="sm" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.commentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquareIcon className="size-3" /> {task.commentCount}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <PaperclipIcon className="size-3" /> {task.attachments.length}
            </span>
          )}
          {task.dueDate && <span>{task.dueDate.slice(5).split("-").reverse().join("/")}</span>}
        </div>
      </div>
    </div>
  )
}

function DraggableKanbanCard({
  task,
  onClick,
  canDrag,
}: {
  task: Task
  onClick: () => void
  canDrag: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "w-full touch-none text-left transition-opacity",
        isDragging && "opacity-40",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      )}
      {...listeners}
      {...attributes}
    >
      <KanbanCardBody task={task} />
    </button>
  )
}

function KanbanColumn({
  status,
  tasks,
  onCardClick,
  onCreate,
  canCreate,
}: {
  status: TaskStatus
  tasks: Task[]
  onCardClick: (id: string) => void
  onCreate: () => void
  canCreate: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const currentUser = useCurrentUser()
  const config = TASK_STATUS_CONFIG[status]

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <span className={cn("size-2 rounded-full", config.dotClassName)} />
          {config.label}
          <span className="text-muted-foreground">({tasks.length})</span>
        </div>
        {canCreate && (
          <Button variant="ghost" size="icon-xs" onClick={onCreate}>
            <PlusIcon />
            <span className="sr-only">Nova tarefa em {config.label}</span>
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-col gap-2.5 rounded-lg p-1.5 transition-colors",
          isOver && "bg-muted/60 ring-2 ring-primary/30"
        )}
      >
        {tasks.map((task) => (
          <DraggableKanbanCard
            key={task.id}
            task={task}
            onClick={() => onCardClick(task.id)}
            canDrag={!!currentUser && canChangeTaskStatus(currentUser, task)}
          />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard({
  tasks,
  onCardClick,
  onCreateInSector,
  canCreate,
}: {
  tasks: Task[]
  onCardClick: (id: string) => void
  onCreateInSector: (status: TaskStatus) => void
  canCreate: boolean
}) {
  const { changeTaskStatus } = useAtividadesSetor()
  const reduced = useReducedMotion()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [optimisticStatus, setOptimisticStatus] = React.useState<Record<string, TaskStatus>>({})
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const tasksWithOptimism = tasks.map((t) =>
    optimisticStatus[t.id] ? { ...t, status: optimisticStatus[t.id] } : t
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const taskId = String(event.active.id)
    const newStatus = event.over?.id as TaskStatus | undefined
    if (!newStatus) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Optimistic move: the card jumps to the new column immediately, then
    // rolls back if the store rejects the change (e.g. permission denied).
    setOptimisticStatus((prev) => ({ ...prev, [taskId]: newStatus }))
    const result = await changeTaskStatus(taskId, newStatus)
    setOptimisticStatus((prev) => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível mover a tarefa")
    }
  }

  const activeTask = activeId ? tasksWithOptimism.find((t) => t.id === activeId) : undefined

  if (tasks.length === 0 && !canCreate) {
    return (
      <EmptyState
        title="Nenhuma tarefa por aqui"
        description="Crie uma tarefa ou ajuste os filtros para ver o quadro."
      />
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 lg:px-6">
        {TASK_STATUS_ORDER.map((status, index) => (
          <motion.div
            key={status}
            variants={kanbanColumnIn(reduced, index)}
            initial="hidden"
            animate="show"
          >
            <KanbanColumn
              status={status}
              tasks={tasksWithOptimism.filter((t) => t.status === status)}
              onCardClick={onCardClick}
              onCreate={() => onCreateInSector(status)}
              canCreate={canCreate}
            />
          </motion.div>
        ))}
      </div>
      <DragOverlay>{activeTask && <KanbanCardBody task={activeTask} />}</DragOverlay>
    </DndContext>
  )
}
