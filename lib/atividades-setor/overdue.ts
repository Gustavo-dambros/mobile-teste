import type { Task } from "@/components/atividades-setor/types"

/**
 * Overdue is always a computed condition, never a stored status — a task
 * can be "pendente" or "em_andamento" and overdue at the same time. See
 * spec §20: never auto-flip the primary status to represent lateness.
 */
export function computeOverdue(task: Pick<Task, "dueDate" | "dueTime" | "status">): {
  overdue: boolean
  days: number
} {
  if (!task.dueDate || task.status === "concluida") return { overdue: false, days: 0 }
  const due = new Date(`${task.dueDate}T${task.dueTime ?? "23:59"}:00`).getTime()
  const diffMs = Date.now() - due
  if (diffMs <= 0) return { overdue: false, days: 0 }
  return { overdue: true, days: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) }
}
