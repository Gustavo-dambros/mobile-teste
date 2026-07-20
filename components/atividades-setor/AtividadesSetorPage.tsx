"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import { PlusIcon } from "lucide-react"

import { pageHeader } from "@/lib/motion"
import type { UserRole } from "@/lib/atividades-setor/permissions"
import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import type { Task } from "@/components/atividades-setor/types"
import type { CalendarItem } from "@/lib/atividades-setor/calendar-items"
import { ActivityNotificationBell } from "@/components/atividades-setor/ActivityNotificationBell"
import { ActivityCalendar } from "@/components/atividades-setor/calendar/ActivityCalendar"
import { ConfirmDialog } from "@/components/atividades-setor/ConfirmDialog"
import { DayActivitiesDialog } from "@/components/atividades-setor/DayActivitiesDialog"
import { EventFormDialog } from "@/components/atividades-setor/EventFormDialog"
import { BoardSkeleton } from "@/components/atividades-setor/StateViews"
import { TaskDetailSheet } from "@/components/atividades-setor/TaskDetailSheet"
import { TaskFormDrawer } from "@/components/atividades-setor/TaskFormDrawer"
import { Button } from "@/components/ui/button"

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  gestor: "Gestor de setor",
  colaborador: "Colaborador",
}

function AtividadesSetorPageInner() {
  const reduced = useReducedMotion()
  const router = useRouter()
  const { role, visibleTasks, visibleEvents, deleteTask, hardDeleteTask } = useAtividadesSetor()

  const [isLoading, setIsLoading] = React.useState(true)
  React.useEffect(() => {
    const t = window.setTimeout(() => setIsLoading(false), 450)
    return () => window.clearTimeout(t)
  }, [])

  const [eventFormOpen, setEventFormOpen] = React.useState(false)
  const [eventFormInitialDate, setEventFormInitialDate] = React.useState<string | undefined>()
  const [dayDialogDate, setDayDialogDate] = React.useState<string | null>(null)

  const [detailTaskId, setDetailTaskId] = React.useState<string | null>(null)
  const [taskFormOpen, setTaskFormOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)

  const [deletingTask, setDeletingTask] = React.useState<Task | null>(null)
  const [hardDeleteStep, setHardDeleteStep] = React.useState<0 | 1 | 2>(0)
  const [hardDeleteTarget, setHardDeleteTarget] = React.useState<Task | null>(null)

  function openCreateEvent(dateISO?: string) {
    setEventFormInitialDate(dateISO)
    setEventFormOpen(true)
  }
  function openEditTask(task: Task) {
    setEditingTask(task)
    setTaskFormOpen(true)
  }
  function openActivity(id: string) {
    router.push(`/atividades-setor/${id}`)
  }

  function handleCalendarDayClick(dateISO: string) {
    setDayDialogDate(dateISO)
  }
  function handleCalendarItemClick(item: CalendarItem) {
    openActivity(item.refId)
  }

  async function handleConfirmDeleteTask() {
    if (!deletingTask) return
    const result = await deleteTask(deletingTask.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir a tarefa")
      setDeletingTask(null)
      return
    }
    toast.success("Tarefa excluída")
    setDeletingTask(null)
    setDetailTaskId(null)
  }

  async function handleHardDeleteFinal() {
    if (!hardDeleteTarget) return
    const result = await hardDeleteTask(hardDeleteTarget.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir definitivamente")
    } else {
      toast.success("Tarefa excluída definitivamente")
    }
    setHardDeleteStep(0)
    setHardDeleteTarget(null)
    setDetailTaskId(null)
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <motion.div
        variants={pageHeader(reduced, 0.05)}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3 px-4 lg:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Atividades do Setor</h2>
            <p className="text-sm text-muted-foreground">
              Calendário de atividades da equipe — clique numa atividade para abrir o quadro dela
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActivityNotificationBell onOpenTask={setDetailTaskId} onOpenEvent={openActivity} />
            <Button size="sm" onClick={() => openCreateEvent()}>
              <PlusIcon data-icon="inline-start" />
              Criar atividade
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Papel atual: <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span>
        </p>
      </motion.div>

      {isLoading ? (
        <BoardSkeleton />
      ) : (
        <ActivityCalendar
          tasks={visibleTasks}
          events={visibleEvents}
          onDayClick={handleCalendarDayClick}
          onItemClick={handleCalendarItemClick}
        />
      )}

      <DayActivitiesDialog
        dateISO={dayDialogDate}
        onOpenChange={(open) => !open && setDayDialogDate(null)}
        onSelectActivity={(event) => {
          setDayDialogDate(null)
          openActivity(event.id)
        }}
        onCreateActivity={() => {
          const date = dayDialogDate ?? undefined
          setDayDialogDate(null)
          openCreateEvent(date)
        }}
      />
      <EventFormDialog
        open={eventFormOpen}
        onOpenChange={setEventFormOpen}
        event={null}
        initialDate={eventFormInitialDate}
      />
      <TaskFormDrawer open={taskFormOpen} onOpenChange={setTaskFormOpen} task={editingTask} />
      <TaskDetailSheet
        taskId={detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        onEdit={(task) => {
          setDetailTaskId(null)
          openEditTask(task)
        }}
        onRequestDelete={(task) => setDeletingTask(task)}
        onRequestHardDelete={(task) => {
          setHardDeleteTarget(task)
          setHardDeleteStep(1)
        }}
      />

      <ConfirmDialog
        open={!!deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(null)}
        title="Excluir tarefa"
        description="Tem certeza de que deseja excluir esta tarefa? Ela será movida para a lixeira e poderá ser restaurada por um administrador."
        confirmLabel="Excluir"
        onConfirm={handleConfirmDeleteTask}
      />
      <ConfirmDialog
        open={hardDeleteStep === 1}
        onOpenChange={(open) => !open && setHardDeleteStep(0)}
        title="Excluir definitivamente"
        description="Esta ação remove a tarefa e todo o seu histórico permanentemente. Deseja continuar?"
        confirmLabel="Continuar"
        onConfirm={() => setHardDeleteStep(2)}
      />
      <ConfirmDialog
        open={hardDeleteStep === 2}
        onOpenChange={(open) => !open && setHardDeleteStep(0)}
        title="Confirmar exclusão definitiva"
        description="Esta é a confirmação final. A tarefa não poderá ser recuperada de forma alguma. Confirma a exclusão definitiva?"
        confirmLabel="Excluir definitivamente"
        onConfirm={handleHardDeleteFinal}
      />
    </div>
  )
}

export function AtividadesSetorPage() {
  return (
    <React.Suspense fallback={<BoardSkeleton />}>
      <AtividadesSetorPageInner />
    </React.Suspense>
  )
}
