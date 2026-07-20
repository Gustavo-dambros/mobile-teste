import type { CardPriority, RecurrenceType, ReminderType } from "@/components/kanban/types"

interface PriorityConfig {
  label: string
  className: string
  dotClassName: string
}

export const PRIORITY_ORDER: CardPriority[] = ["baixa", "media", "alta", "urgente"]

export const PRIORITY_CONFIG: Record<CardPriority, PriorityConfig> = {
  baixa: { label: "Baixa", className: "text-muted-foreground", dotClassName: "bg-muted-foreground" },
  media: { label: "Média", className: "text-foreground", dotClassName: "bg-foreground" },
  alta: {
    label: "Alta",
    className: "text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  urgente: { label: "Urgente", className: "text-destructive", dotClassName: "bg-destructive" },
}

export const REMINDER_ITEMS: { value: ReminderType; label: string }[] = [
  { value: "no_horario", label: "No horário do prazo" },
  { value: "10min", label: "10 minutos antes" },
  { value: "30min", label: "30 minutos antes" },
  { value: "1h", label: "1 hora antes" },
  { value: "1dia", label: "1 dia antes" },
  { value: "2dias", label: "2 dias antes" },
  { value: "personalizado", label: "Personalizado" },
]

export const REMINDER_OFFSET_MINUTES: Partial<Record<ReminderType, number>> = {
  no_horario: 0,
  "10min": 10,
  "30min": 30,
  "1h": 60,
  "1dia": 1440,
  "2dias": 2880,
}

export const RECURRENCE_ITEMS: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "Não repetir" },
  { value: "diaria", label: "Diariamente" },
  { value: "semanal", label: "Semanalmente" },
  { value: "mensal", label: "Mensalmente" },
  { value: "anual", label: "Anualmente" },
  { value: "personalizado", label: "Personalizado" },
]

/** Board cover / label colour swatches — accessible in both themes, never tied to a fixed name. */
export const SWATCH_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#db2777",
  "#ea580c",
  "#0d9488",
  "#dc2626",
  "#4f46e5",
  "#ca8a04",
  "#0891b2",
  "#65a30d",
  "#c026d3",
]

export const DEFAULT_COLUMN_TITLES = ["A fazer", "Em andamento", "Concluído"]
