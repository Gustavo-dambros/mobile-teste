"use client"

import * as React from "react"
import { toast } from "sonner"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { RECURRENCE_ITEMS } from "@/lib/kanban/constants"
import { isOverdue } from "@/lib/kanban/notifications"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard, RecurrenceType } from "@/components/kanban/types"
import { ReminderSelector } from "@/components/kanban/ReminderSelector"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function timeFromISO(iso?: string) {
  return iso ? new Date(iso).toTimeString().slice(0, 5) : "09:00"
}

export function DueDatePicker({ card }: { card: KanbanCard }) {
  const { setDueDate, removeDueDate } = useKanban()
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(card.dueAt ? new Date(card.dueAt) : undefined)
  const [time, setTime] = React.useState(timeFromISO(card.dueAt))
  const [reminderType, setReminderType] = React.useState(card.reminderType)
  const [reminderCustomMinutes, setReminderCustomMinutes] = React.useState(card.reminderCustomMinutes)
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceType>(card.recurrenceType ?? "none")

  // Reset the form fields whenever the popover transitions to open, without
  // a useEffect — plain render-time state adjustment (React's documented
  // "adjusting state when a prop changes" pattern).
  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDate(card.dueAt ? new Date(card.dueAt) : undefined)
      setTime(timeFromISO(card.dueAt))
      setReminderType(card.reminderType)
      setReminderCustomMinutes(card.reminderCustomMinutes)
      setRecurrenceType(card.recurrenceType ?? "none")
    }
  }

  async function handleSave() {
    if (!date) {
      toast.error("Selecione uma data")
      return
    }
    const [h, m] = time.split(":").map(Number)
    const dueAt = new Date(date)
    dueAt.setHours(h || 0, m || 0, 0, 0)
    const result = await setDueDate(card.id, {
      startAt: card.startAt,
      dueAt: dueAt.toISOString(),
      reminderType,
      reminderCustomMinutes: reminderType === "personalizado" ? reminderCustomMinutes : undefined,
      recurrenceType,
      recurrenceCustomDays: card.recurrenceCustomDays,
    })
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o prazo")
      return
    }
    toast.success("Prazo salvo")
    setOpen(false)
  }

  function handleRemove() {
    removeDueDate(card.id)
    toast.success("Prazo removido")
    setOpen(false)
  }

  const overdue = isOverdue(card)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className={cn(overdue && "border-destructive/40 text-destructive")} />}
      >
        <CalendarIcon data-icon="inline-start" />
        {card.dueAt
          ? new Date(card.dueAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Definir prazo"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Prazo de entrega</PopoverTitle>
        </PopoverHeader>
        <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} className="mx-auto p-0" />
        <Field orientation="horizontal">
          <FieldLabel htmlFor="due-time" className="w-16 shrink-0">
            Horário
          </FieldLabel>
          <Input id="due-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" />
        </Field>
        <Field>
          <FieldLabel>Lembrete</FieldLabel>
          <ReminderSelector
            value={reminderType}
            customMinutes={reminderCustomMinutes}
            onChange={setReminderType}
            onCustomMinutesChange={setReminderCustomMinutes}
          />
        </Field>
        <Field>
          <FieldLabel>Repetição</FieldLabel>
          <Select
            value={recurrenceType}
            onValueChange={(v) => v && setRecurrenceType(v as RecurrenceType)}
            items={RECURRENCE_ITEMS}
          >
            <SelectTrigger size="sm" className="w-full" aria-label="Repetição">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {RECURRENCE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center justify-between gap-2 pt-1">
          {card.dueAt ? (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={handleRemove}>
              <XIcon data-icon="inline-start" />
              Remover prazo
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="sm" onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
