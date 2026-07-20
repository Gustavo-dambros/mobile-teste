"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { ChevronLeftIcon, ChevronRightIcon, MegaphoneIcon, PresentationIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { cardsContainer, fadeIn, metricCard } from "@/lib/motion"
import type { Announcement } from "@/components/announcements/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

function EventChip({
  announcement,
  onClick,
}: {
  announcement: Announcement
  onClick: () => void
}) {
  return (
    <Badge
      variant={announcement.type === "Evento" ? "default" : "secondary"}
      className="w-full cursor-pointer justify-start gap-1 overflow-hidden"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {announcement.type === "Evento" ? (
        <PresentationIcon data-icon="inline-start" />
      ) : (
        <MegaphoneIcon data-icon="inline-start" />
      )}
      <span className="truncate">
        {announcement.time} {announcement.title}
      </span>
    </Badge>
  )
}

export function AnnouncementCalendar({
  month,
  onMonthChange,
  announcements,
  onDayClick,
  onEventClick,
}: {
  month: Date
  onMonthChange: (next: Date) => void
  announcements: Announcement[]
  onDayClick: (dateISO: string) => void
  onEventClick: (id: string) => void
}) {
  const reduced = useReducedMotion()
  const today = new Date()
  const days = React.useMemo(() => buildMonthGrid(month), [month])

  const byDate = React.useMemo(() => {
    const map = new Map<string, Announcement[]>()
    for (const a of announcements) {
      const list = map.get(a.date) ?? []
      list.push(a)
      map.set(a.date, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time))
    }
    return map
  }, [announcements])

  function goToPreviousMonth() {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  }
  function goToNextMonth() {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))
  }
  function goToToday() {
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <motion.h2
          key={monthLabel}
          variants={fadeIn(reduced)}
          initial="hidden"
          animate="show"
          className="text-lg font-semibold capitalize"
        >
          {monthLabel}
        </motion.h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goToPreviousMonth}>
            <ChevronLeftIcon />
            <span className="sr-only">Mês anterior</span>
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRightIcon />
            <span className="sr-only">Próximo mês</span>
          </Button>
        </div>
      </div>

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
            const dayEvents = byDate.get(dateISO) ?? []
            const visible = dayEvents.slice(0, MAX_VISIBLE_PER_DAY)
            const overflow = dayEvents.length - visible.length

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
                  {visible.map((a) => (
                    <EventChip key={a.id} announcement={a} onClick={() => onEventClick(a.id)} />
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
                          {day.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                          })}
                        </span>
                        {dayEvents.map((a) => (
                          <EventChip
                            key={a.id}
                            announcement={a}
                            onClick={() => onEventClick(a.id)}
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
    </div>
  )
}
