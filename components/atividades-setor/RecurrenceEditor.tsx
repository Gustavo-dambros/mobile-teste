"use client"

import { cn } from "@/lib/utils"
import type { RecurrenceFrequency, RecurrenceRule } from "@/components/atividades-setor/types"
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

const FREQUENCY_ITEMS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "diaria", label: "Diariamente" },
  { value: "semanal", label: "Semanalmente" },
  { value: "mensal", label: "Mensalmente" },
  { value: "anual", label: "Anualmente" },
]

const WEEKDAY_ITEMS = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
]

const SELECT_ITEMS = [{ value: "none", label: "Não se repete" }, ...FREQUENCY_ITEMS]

/** Shared recurrence editor for tasks and events — see lib/atividades-setor/recurrence.ts. */
export function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceRule | undefined
  onChange: (next: RecurrenceRule | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Select
        value={value ? value.freq : "none"}
        onValueChange={(v) => {
          if (v === "none") {
            onChange(undefined)
            return
          }
          onChange({
            freq: v as RecurrenceFrequency,
            interval: value?.interval ?? 1,
            byWeekday: value?.byWeekday,
            until: value?.until,
            count: value?.count,
          })
        }}
        items={SELECT_ITEMS}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Não se repete" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {SELECT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {value && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="recurrence-interval">Repetir a cada</FieldLabel>
              <Input
                id="recurrence-interval"
                type="number"
                min={1}
                value={value.interval}
                onChange={(e) =>
                  onChange({ ...value, interval: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="recurrence-count">Número de ocorrências</FieldLabel>
              <Input
                id="recurrence-count"
                type="number"
                min={1}
                value={value.count ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    count: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Sem limite"
              />
            </Field>
          </div>

          {value.freq === "semanal" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel>Dias da semana</FieldLabel>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      byWeekday: value.byWeekday?.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6],
                    })
                  }
                  className="text-xs text-primary hover:underline"
                >
                  {value.byWeekday?.length === 7 ? "Limpar" : "Marcar todos"}
                </button>
              </div>
              <div className="flex gap-1.5">
                {WEEKDAY_ITEMS.map((day) => {
                  const active = value.byWeekday?.includes(day.value) ?? false
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const current = value.byWeekday ?? []
                        const next = active
                          ? current.filter((d) => d !== day.value)
                          : [...current, day.value]
                        onChange({ ...value, byWeekday: next })
                      }}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:bg-muted"
                      )}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="recurrence-until">Repetir até</FieldLabel>
            <Input
              id="recurrence-until"
              type="date"
              value={value.until ?? ""}
              onChange={(e) => onChange({ ...value, until: e.target.value || undefined })}
            />
          </Field>
        </div>
      )}
    </div>
  )
}
