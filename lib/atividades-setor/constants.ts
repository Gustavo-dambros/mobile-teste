import type {
  ActivityNotificationType,
  EventVisibility,
  HistoryAction,
  TaskPriority,
  TaskStatus,
} from "@/components/atividades-setor/types"

interface StatusConfig {
  label: string
  dotClassName: string
  badgeClassName: string
}

/**
 * Single source of truth for task status presentation — components read
 * from this map instead of branching on the raw string. Add a new status
 * here (e.g. "bloqueada") and it becomes available everywhere at once.
 */
export const TASK_STATUS_ORDER: TaskStatus[] = ["pendente", "em_andamento", "concluida"]

export const TASK_STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  pendente: {
    label: "A fazer",
    dotClassName: "bg-destructive",
    badgeClassName: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  em_andamento: {
    label: "Em andamento",
    dotClassName: "bg-blue-500",
    badgeClassName:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:border-blue-400/30 dark:text-blue-400",
  },
  concluida: {
    label: "Concluída",
    dotClassName: "bg-green-500",
    badgeClassName:
      "border-green-500/30 bg-green-500/10 text-green-600 dark:border-green-400/30 dark:text-green-400",
  },
}

interface PriorityConfig {
  label: string
  className: string
}

export const TASK_PRIORITY_ORDER: TaskPriority[] = ["baixa", "media", "alta", "urgente"]

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  baixa: { label: "Baixa", className: "text-muted-foreground" },
  media: { label: "Média", className: "text-foreground" },
  alta: { label: "Alta", className: "text-amber-600 dark:text-amber-400" },
  urgente: { label: "Urgente", className: "text-destructive" },
}

export const EVENT_VISIBILITY_LABELS: Record<EventVisibility, string> = {
  setor: "Todo o setor",
  participantes: "Somente participantes",
  privado: "Privado",
  convidados: "Pessoas convidadas",
  setores_convidados: "Setores convidados",
}

export const HISTORY_ACTION_LABELS: Record<HistoryAction, string> = {
  task_created: "criou a tarefa",
  event_created: "criou o evento",
  title_changed: "alterou o título",
  description_changed: "alterou a descrição",
  assignee_changed: "alterou o responsável",
  due_date_changed: "alterou o prazo",
  status_changed: "alterou o status",
  priority_changed: "alterou a prioridade",
  comment_added: "adicionou um comentário",
  comment_edited: "editou um comentário",
  comment_deleted: "removeu um comentário",
  attachment_added: "adicionou um anexo",
  attachment_removed: "removeu um anexo",
  participant_added: "adicionou um participante",
  participant_removed: "removeu um participante",
  task_archived: "arquivou a tarefa",
  task_deleted: "excluiu a tarefa",
  task_restored: "restaurou a tarefa",
  event_changed: "atualizou o evento",
  event_cancelled: "cancelou o evento",
}

export const NOTIFICATION_TYPE_LABELS: Record<ActivityNotificationType, string> = {
  task_assigned: "Nova tarefa atribuída",
  assignee_changed: "Responsável alterado",
  due_date_changed: "Prazo alterado",
  due_soon: "Prazo próximo",
  task_overdue: "Tarefa atrasada",
  comment_received: "Novo comentário",
  mention: "Você foi mencionado",
  status_changed: "Status alterado",
  task_completed: "Tarefa concluída",
  task_reopened: "Tarefa reaberta",
  event_invite: "Convite para evento",
  event_changed: "Evento alterado",
  event_cancelled: "Evento cancelado",
  event_reminder: "Lembrete de evento",
  participant_removed: "Remoção de participante",
}
