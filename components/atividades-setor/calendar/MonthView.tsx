"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import { cardsContainer, metricCard } from "@/lib/motion"
import type { CalendarItem } from "@/lib/atividades-setor/calendar-items"
import { CalendarItemChip } from "@/components/atividades-setor/calendar/CalendarItemChip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MAX_VISIBLE_PER_DAY = 3

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function buildMonthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(gridStart.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

export function MonthView({
  month,
  items,
  onDayClick,
  onItemClick,
}: {
  month: Date
  items: CalendarItem[]
  onDayClick: (dateISO: string) => void
  onItemClick: (item: CalendarItem) => void
}) {
  const reduced = useReducedMotion()
  const today = new Date()
  const days = React.useMemo(() => buildMonthGrid(month), [month])

  const byDate = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return map
  }, [items])

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="bg-muted py-1.5 text-center text-xs font-medium text-muted-foreground"
        >
          {label}
        </div>
      ))}
      <motion.div
        variants={cardsContainer(reduced, 0)}
        initial="hidden"
        animate="show"
        className="col-span-7 grid grid-cols-7 gap-px"
      >
        {days.map((day) => {
          const dateISO = toISODate(day)
          const isCurrentMonth = day.getMonth() === month.getMonth()
          const isToday = isSameDay(day, today)
          const dayItems = byDate.get(dateISO) ?? []
          const visible = dayItems.slice(0, MAX_VISIBLE_PER_DAY)
          const overflow = dayItems.length - visible.length

          return (
            <motion.div
              key={dateISO}
              role="button"
              tabIndex={0}
              variants={metricCard(reduced)}
              onClick={() => onDayClick(dateISO)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onDayClick(dateISO)
                }
              }}
              className={cn(
                "flex min-h-24 flex-col items-stretch gap-1 bg-background p-1.5 text-left transition-colors hover:bg-muted/60 sm:min-h-28",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday && "bg-primary text-primary-foreground"
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-1 flex-col gap-1">
                {visible.map((item) => (
                  <CalendarItemChip key={item.id} item={item} onClick={() => onItemClick(item)} />
                ))}
                {overflow > 0 && (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded px-1 text-left text-xs text-muted-foreground hover:text-foreground hover:underline"
                        />
                      }
                    >
                      +{overflow} mais
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="flex w-64 flex-col gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {day.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                      </span>
                      {dayItems.map((item) => (
                        <CalendarItemChip
                          key={item.id}
                          item={item}
                          onClick={() => onItemClick(item)}
                          dense={false}
                        />
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
