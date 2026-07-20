"use client"

import { FilterIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/kanban/constants"
import { countActiveFilters, type DueFilter, type KanbanFilters as KanbanFiltersState } from "@/lib/kanban/filters"
import type { KanbanColumn, KanbanLabel } from "@/components/kanban/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "overdue", label: "Vencidas" },
  { value: "today", label: "Hoje" },
  { value: "tomorrow", label: "Amanhã" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "none", label: "Sem prazo" },
]

const BOOLEAN_FILTERS: { key: "completed" | "overdue" | "noDueDate" | "hasAttachments" | "hasChecklist"; label: string }[] = [
  { key: "completed", label: "Atividades concluídas" },
  { key: "overdue", label: "Atividades atrasadas" },
  { key: "noDueDate", label: "Atividades sem prazo" },
  { key: "hasAttachments", label: "Atividades com anexos" },
  { key: "hasChecklist", label: "Atividades com checklist" },
]

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors",
        active
          ? "border-foreground/30 bg-muted text-foreground"
          : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

export function KanbanFilters({
  filters,
  onFiltersChange,
  onClear,
  columns,
  labels,
}: {
  filters: KanbanFiltersState
  onFiltersChange: (filters: KanbanFiltersState) => void
  onClear: () => void
  columns: KanbanColumn[]
  labels: KanbanLabel[]
}) {
  const activeCount = countActiveFilters(filters)

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="relative" />}>
        <FilterIcon />
        <span className="sr-only">Filtros</span>
        {activeCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 size-4 rounded-full px-1 tabular-nums">
            {activeCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex items-center justify-between">
          <PopoverHeader className="p-0">
            <PopoverTitle>Filtros</PopoverTitle>
          </PopoverHeader>
          {activeCount > 0 && (
            <Button variant="ghost" size="xs" onClick={onClear}>
              <XIcon data-icon="inline-start" />
              Limpar
            </Button>
          )}
        </div>

        {columns.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Coluna</p>
            <div className="flex flex-wrap gap-1">
              {columns.map((column) => (
                <Chip
                  key={column.id}
                  active={filters.columnId === column.id}
                  onClick={() => onFiltersChange({ ...filters, columnId: filters.columnId === column.id ? null : column.id })}
                >
                  {column.title}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Prioridade</p>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_ORDER.map((priority) => (
              <Chip
                key={priority}
                active={filters.priority === priority}
                onClick={() => onFiltersChange({ ...filters, priority: filters.priority === priority ? null : priority })}
              >
                <span className={cn("size-1.5 rounded-full", PRIORITY_CONFIG[priority].dotClassName)} />
                {PRIORITY_CONFIG[priority].label}
              </Chip>
            ))}
          </div>
        </div>

        {labels.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Etiqueta</p>
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <Chip
                  key={label.id}
                  active={filters.labelId === label.id}
                  onClick={() => onFiltersChange({ ...filters, labelId: filters.labelId === label.id ? null : label.id })}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Prazo</p>
          <div className="flex flex-wrap gap-1">
            {DUE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                active={filters.due === option.value}
                onClick={() => onFiltersChange({ ...filters, due: filters.due === option.value ? null : option.value })}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-2">
          {BOOLEAN_FILTERS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`kanban-filter-${key}`}
                checked={filters[key]}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, [key]: checked === true })}
              />
              <Label htmlFor={`kanban-filter-${key}`} className="text-sm font-normal">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
