"use client"

import * as React from "react"
import { CalendarIcon, FilterIcon, XIcon } from "lucide-react"

import type { TicketPriority, TicketStatus } from "@/components/tickets/types"
import { useCurrentUser } from "@/lib/current-user/context"
import { priorityItems, statusItems } from "@/lib/tickets/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

export type TicketFiltersMode = "mine" | "queue" | "history"

export interface TicketFiltersValue {
  statuses: TicketStatus[]
  priorities: TicketPriority[]
  showCompleted: boolean
  showClosedByMe: boolean
  date: string
  /** Fila: show only tickets with status "Aberto" (queue mode). */
  queueOnly: boolean
  /** Filter by a specific teammate's name (queue/history modes). */
  assignee: string
  /** Meus atendimentos: tickets where the current user is the assignee (queue mode). */
  onlyMine: boolean
  /** Fila: show only tickets past the no-first-response SLA (queue mode). */
  overdueOnly: boolean
}

export const defaultTicketFilters: TicketFiltersValue = {
  statuses: [],
  priorities: [],
  showCompleted: true,
  showClosedByMe: true,
  date: "",
  queueOnly: false,
  assignee: "",
  onlyMine: false,
  overdueOnly: false,
}

function countActiveFilters(value: TicketFiltersValue, mode: TicketFiltersMode) {
  let count = value.priorities.length
  if (mode === "mine") {
    count += value.statuses.length
    if (!value.showCompleted) count += 1
    if (!value.showClosedByMe) count += 1
  }
  if (mode === "queue") {
    count += value.statuses.length
    if (value.queueOnly) count += 1
    if (value.onlyMine) count += 1
    if (value.overdueOnly) count += 1
  }
  if (value.assignee) count += 1
  if (value.date) count += 1
  return count
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export function TicketFilters({
  value,
  onChange,
  mode = "mine",
}: {
  value: TicketFiltersValue
  onChange: (value: TicketFiltersValue) => void
  mode?: TicketFiltersMode
}) {
  const activeCount = countActiveFilters(value, mode)
  const [dateOpen, setDateOpen] = React.useState(false)
  const currentUser = useCurrentUser()
  const [sectorMembers, setSectorMembers] = React.useState<{ id: string; name: string }[]>([])

  React.useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    fetch(`/api/tickets/staff?sector=${currentUser.sector}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSectorMembers(data.staff ?? [])
      })
      .catch(() => {
        if (!cancelled) setSectorMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [currentUser])

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <FilterIcon data-icon="inline-start" />
        Filtrar
        {activeCount > 0 && (
          <Badge variant="secondary" className="ml-1 rounded-full">
            {activeCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96">
        <div className="flex flex-col gap-4">
          {mode === "queue" && (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Fila
                </Label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.queueOnly}
                    onCheckedChange={(checked) =>
                      onChange({ ...value, queueOnly: !!checked })
                    }
                  />
                  Mostrar apenas chamados na fila (Aberto)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.onlyMine}
                    onCheckedChange={(checked) =>
                      onChange({ ...value, onlyMine: !!checked })
                    }
                  />
                  Meus atendimentos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.overdueOnly}
                    onCheckedChange={(checked) =>
                      onChange({ ...value, overdueOnly: !!checked })
                    }
                  />
                  Mostrar apenas atrasados
                </label>
              </div>
              <Separator />
            </>
          )}

          {mode === "mine" && (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Status
                </Label>
                <div className="flex flex-nowrap items-center gap-4">
                  {statusItems.map((s) => (
                    <label
                      key={s.value}
                      className="flex items-center gap-1.5 text-sm whitespace-nowrap"
                    >
                      <Checkbox
                        checked={value.statuses.includes(s.value)}
                        onCheckedChange={() =>
                          onChange({
                            ...value,
                            statuses: toggleValue(value.statuses, s.value),
                          })
                        }
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Prioridade
            </Label>
            <div className="flex flex-nowrap items-center gap-4">
              {priorityItems.map((p) => (
                <label
                  key={p.value}
                  className="flex items-center gap-1.5 text-sm whitespace-nowrap"
                >
                  <Checkbox
                    checked={value.priorities.includes(p.value)}
                    onCheckedChange={() =>
                      onChange({
                        ...value,
                        priorities: toggleValue(value.priorities, p.value),
                      })
                    }
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {(mode === "queue" || mode === "history") && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Colaborador
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, assignee: "" })}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      value.assignee === ""
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    Todos
                  </button>
                  {sectorMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => onChange({ ...value, assignee: member.name })}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        value.assignee === member.name
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === "mine" && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Histórico
                </Label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.showCompleted}
                    onCheckedChange={(checked) =>
                      onChange({ ...value, showCompleted: !!checked })
                    }
                  />
                  Mostrar chamados concluídos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.showClosedByMe}
                    onCheckedChange={(checked) =>
                      onChange({ ...value, showClosedByMe: !!checked })
                    }
                  />
                  Mostrar chamados que eu mesmo fechei
                </label>
              </div>
            </>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Data de abertura
            </Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                  />
                }
              >
                <CalendarIcon className="opacity-60" />
                <span className={!value.date ? "text-muted-foreground" : ""}>
                  {value.date ? formatDisplayDate(value.date) : "Selecionar data"}
                </span>
                {value.date && (
                  <button
                    type="button"
                    className="ml-auto rounded-full p-0.5 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange({ ...value, date: "" })
                    }}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value.date ? new Date(`${value.date}T00:00:00`) : undefined}
                  onSelect={(date) => {
                    onChange({ ...value, date: date ? toISODate(date) : "" })
                    setDateOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(defaultTicketFilters)}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
