"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { fadeIn } from "@/lib/motion"
import { buildCalendarItems } from "@/lib/atividades-setor/calendar-items"
import type { CalendarEvent, Task } from "@/components/atividades-setor/types"
import { MonthView } from "@/components/atividades-setor/calendar/MonthView"
import { Button } from "@/components/ui/button"
import type { CalendarItem } from "@/lib/atividades-setor/calendar-items"

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Plain month grid, matching the anúncios/eventos calendar — no other view modes. */
export function ActivityCalendar({
  tasks,
  events,
  onDayClick,
  onItemClick,
}: {
  tasks: Task[]
  events: CalendarEvent[]
  onDayClick: (dateISO: string) => void
  onItemClick: (item: CalendarItem) => void
}) {
  const reduced = useReducedMotion()
  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()))

  function goToday() {
    setAnchor(startOfDay(new Date()))
  }

  function step(direction: 1 | -1) {
    const next = new Date(anchor)
    next.setMonth(next.getMonth() + direction)
    setAnchor(next)
  }

  const { rangeStart, rangeEnd, label } = React.useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const gridStart = new Date(first)
    gridStart.setDate(gridStart.getDate() - first.getDay())
    const gridEnd = new Date(gridStart)
    gridEnd.setDate(gridEnd.getDate() + 41)
    return {
      rangeStart: gridStart,
      rangeEnd: gridEnd,
      label: anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    }
  }, [anchor])

  const items = React.useMemo(
    () => buildCalendarItems(events, tasks, rangeStart, rangeEnd),
    [events, tasks, rangeStart, rangeEnd]
  )

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <motion.h2
          key={label}
          variants={fadeIn(reduced)}
          initial="hidden"
          animate="show"
          className="text-lg font-semibold capitalize"
        >
          {label}
        </motion.h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => step(-1)}>
            <ChevronLeftIcon />
            <span className="sr-only">Anterior</span>
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => step(1)}>
            <ChevronRightIcon />
            <span className="sr-only">Próximo</span>
          </Button>
        </div>
      </div>

      <MonthView month={anchor} items={items} onDayClick={onDayClick} onItemClick={onItemClick} />
    </div>
  )
}
