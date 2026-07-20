"use client"

import * as React from "react"
import Image from "next/image"
import { toast } from "sonner"
import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  PencilIcon,
  RotateCcwIcon,
  StarIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"

import { formatDateTime } from "@/lib/tickets/format"
import {
  HISTORY_ACTION_LABELS,
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
} from "@/lib/atividades-setor/constants"
import {
  canArchiveTask,
  canChangeTaskStatus,
  canDeleteTask,
  canEditTask,
  canHardDeleteTask,
  canRestoreTask,
} from "@/lib/atividades-setor/permissions"
import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import { useCurrentUser } from "@/lib/current-user/context"
import { computeOverdue } from "@/lib/atividades-setor/overdue"
import type { Task } from "@/components/atividades-setor/types"
import { ChecklistSection } from "@/components/atividades-setor/ChecklistSection"
import { CommentThread } from "@/components/atividades-setor/CommentThread"
import { UserAvatarBadge } from "@/components/atividades-setor/UserAvatarBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function TaskDetailSheet({
  taskId,
  onOpenChange,
  onEdit,
  onRequestDelete,
  onRequestHardDelete,
}: {
  taskId: string | null
  onOpenChange: (open: boolean) => void
  onEdit: (task: Task) => void
  onRequestDelete: (task: Task) => void
  onRequestHardDelete: (task: Task) => void
}) {
  const { getTask, changeTaskStatus, archiveTask, restoreTask, duplicateTask, getTaskHistory, loadTaskHistory } =
    useAtividadesSetor()
  const currentUser = useCurrentUser()

  const task = taskId ? getTask(taskId) : undefined
  const notFound = !!taskId && !task
  const history = task ? getTaskHistory(task.id) : []

  React.useEffect(() => {
    if (!taskId) return
    void loadTaskHistory(taskId)
  }, [taskId, loadTaskHistory])

  if (!task) {
    return (
      <Sheet open={!!taskId} onOpenChange={(open) => !open && onOpenChange(false)}>
        <SheetContent className="w-full sm:max-w-lg">
          {notFound && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <h3 className="text-sm font-medium">Sem permissão para visualizar</h3>
              <p className="text-sm text-muted-foreground">
                Você não tem acesso a esta tarefa.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    )
  }

  const statusConfig = TASK_STATUS_CONFIG[task.status]
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority]
  const { overdue, days } = computeOverdue(task)
  // Each button is gated by the exact same rule the server re-validates on
  // submit — this only controls what renders, never the authorization itself.
  const canEditFields = !!currentUser && !task.deletedAt && canEditTask(currentUser, task)
  const canToggleStatus = !!currentUser && !task.deletedAt && canChangeTaskStatus(currentUser, task)
  const canDuplicate = canEditFields
  const canArchiveThis = !!currentUser && !task.deletedAt && canArchiveTask(currentUser, task)
  const canDeleteThis = !!currentUser && !task.deletedAt && canDeleteTask(currentUser, task)
  const canRestoreThis = !!currentUser && !!task.deletedAt && canRestoreTask(currentUser)
  const canHardDeleteThis = !!currentUser && !!task.deletedAt && canHardDeleteTask(currentUser)
  const hasAnyAction =
    canEditFields ||
    canToggleStatus ||
    canDuplicate ||
    canArchiveThis ||
    canDeleteThis ||
    canRestoreThis ||
    canHardDeleteThis

  const images = task.attachments.filter((a) => a.kind === "image")
  const videos = task.attachments.filter((a) => a.kind === "video")
  const others = task.attachments.filter((a) => a.kind !== "image" && a.kind !== "video")

  async function handleStatusAction(next: Task["status"]) {
    const result = await changeTaskStatus(task!.id, next)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível alterar o status")
      return
    }
    toast.success(next === "concluida" ? "Tarefa concluída" : "Tarefa reaberta")
  }

  async function handleArchive() {
    const result = await archiveTask(task!.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível arquivar a tarefa")
      return
    }
    toast.success("Tarefa arquivada")
  }

  async function handleRestore() {
    const result = await restoreTask(task!.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível restaurar a tarefa")
      return
    }
    toast.success("Tarefa restaurada")
  }

  async function handleDuplicate() {
    const result = await duplicateTask(task!.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível duplicar a tarefa")
      return
    }
    toast.success("Tarefa duplicada")
  }

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && onOpenChange(false)}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusConfig.badgeClassName} variant="outline">
              <span className={`mr-1 size-1.5 rounded-full ${statusConfig.dotClassName}`} />
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className={priorityConfig.className}>
              Prioridade: {priorityConfig.label}
            </Badge>
            {task.isPriority && (
              <Badge variant="secondary" className="gap-1">
                <StarIcon className="size-3" />
                Prioritária
              </Badge>
            )}
            {overdue && (
              <Badge variant="destructive">
                Atrasada há {days} {days === 1 ? "dia" : "dias"}
              </Badge>
            )}
            {task.archivedAt && <Badge variant="outline">Arquivada</Badge>}
            {task.deletedAt && <Badge variant="destructive">Excluída</Badge>}
          </div>
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
          <SheetDescription className="whitespace-pre-wrap break-words text-foreground/80">
            {task.description || "Sem descrição."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Responsável</span>
              <UserAvatarBadge userId={task.assigneeId} size="sm" showName />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Criador</span>
              <UserAvatarBadge userId={task.creatorId} size="sm" showName />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Setor</span>
              <span>{task.sector}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Categoria</span>
              <span>{task.category || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarIcon className="size-3" /> Início
              </span>
              <span>{task.startDate ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="size-3" /> Prazo
              </span>
              <span>
                {task.dueDate ? `${task.dueDate}${task.dueTime ? ` às ${task.dueTime}` : ""}` : "—"}
              </span>
            </div>
          </div>

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {task.watcherIds.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Observadores</span>
              <div className="flex flex-wrap gap-2">
                {task.watcherIds.map((id) => (
                  <UserAvatarBadge key={id} userId={id} size="sm" showName />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <span>Criada em {formatDateTime(task.createdAt)}</span>
            {task.updatedAt !== task.createdAt && (
              <span>Atualizada em {formatDateTime(task.updatedAt)}</span>
            )}
          </div>

          {(images.length > 0 || videos.length > 0 || others.length > 0) && <Separator />}

          {images.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Fotos ({images.length})</span>
              <div className="grid grid-cols-3 gap-2">
                {images.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square overflow-hidden rounded-lg border"
                  >
                    <Image src={att.url} alt={att.name} fill unoptimized className="object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Vídeos ({videos.length})</span>
              {videos.map((att) => (
                <video key={att.id} src={att.url} controls className="w-full rounded-lg border" />
              ))}
            </div>
          )}

          {others.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Documentos ({others.length})</span>
              {others.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileTextIcon className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col text-xs">
                    <span className="truncate text-sm font-medium">{att.name}</span>
                    <span className="text-muted-foreground">
                      {att.mimeType || "Arquivo"} · {(att.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    render={<a href={att.url} download={att.name} target="_blank" rel="noreferrer" />}
                  >
                    <DownloadIcon />
                    <span className="sr-only">Baixar {att.name}</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <ChecklistSection taskId={task.id} canEdit={!task.deletedAt} />

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Comentários</span>
            <CommentThread taskId={task.id} canComment={!task.deletedAt} />
          </div>

          {history.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Histórico</span>
                <div className="flex flex-col gap-1.5">
                  {history.map((h) => (
                    <div key={h.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{h.actorName}</span>{" "}
                      {HISTORY_ACTION_LABELS[h.action]} ({formatDateTime(h.createdAt)})
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {hasAnyAction && (
          <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
            {canToggleStatus &&
              (task.status !== "concluida" ? (
                <Button variant="outline" onClick={() => handleStatusAction("concluida")}>
                  <CheckCircle2Icon data-icon="inline-start" />
                  Concluir
                </Button>
              ) : (
                <Button variant="outline" onClick={() => handleStatusAction("pendente")}>
                  <Undo2Icon data-icon="inline-start" />
                  Reabrir
                </Button>
              ))}
            {canDuplicate && (
              <Button variant="outline" onClick={handleDuplicate}>
                <CopyIcon data-icon="inline-start" />
                Duplicar
              </Button>
            )}
            {canArchiveThis && (
              <Button variant="outline" onClick={handleArchive}>
                <ArchiveIcon data-icon="inline-start" />
                Arquivar
              </Button>
            )}
            {canRestoreThis && (
              <Button variant="outline" onClick={handleRestore}>
                <RotateCcwIcon data-icon="inline-start" />
                Restaurar
              </Button>
            )}
            {canEditFields && (
              <Button variant="outline" onClick={() => onEdit(task)}>
                <PencilIcon data-icon="inline-start" />
                Editar
              </Button>
            )}
            {canDeleteThis && (
              <Button variant="outline" onClick={() => onRequestDelete(task)}>
                <Trash2Icon data-icon="inline-start" />
                Excluir
              </Button>
            )}
            {canHardDeleteThis && (
              <Button variant="destructive" onClick={() => onRequestHardDelete(task)}>
                <Trash2Icon data-icon="inline-start" />
                Excluir definitivamente
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

