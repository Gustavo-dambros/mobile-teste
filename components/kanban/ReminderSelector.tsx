"use client"

import { REMINDER_ITEMS } from "@/lib/kanban/constants"
import type { ReminderType } from "@/components/kanban/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ReminderSelector({
  value,
  customMinutes,
  onChange,
  onCustomMinutesChange,
}: {
  value: ReminderType | undefined
  customMinutes: number | undefined
  onChange: (value: ReminderType | undefined) => void
  onCustomMinutesChange: (minutes: number | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={value ?? "none"}
        onValueChange={(v) => onChange(v === "none" ? undefined : (v as ReminderType))}
        items={[{ value: "none", label: "Sem lembrete" }, ...REMINDER_ITEMS]}
      >
        <SelectTrigger size="sm" className="w-full" aria-label="Lembrete">
          <SelectValue placeholder="Sem lembrete" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="none">Sem lembrete</SelectItem>
            {REMINDER_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {value === "personalizado" && (
        <Input
          type="number"
          min={1}
          value={customMinutes ?? ""}
          onChange={(e) => onCustomMinutesChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Minutos antes do prazo"
          aria-label="Minutos antes do prazo"
        />
      )}
    </div>
  )
}
