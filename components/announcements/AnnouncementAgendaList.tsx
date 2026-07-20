"use client"

import { motion, useReducedMotion } from "motion/react"
import { MegaphoneIcon, PlusIcon, PresentationIcon } from "lucide-react"

import { listContainer, listItem } from "@/lib/motion"
import type { Announcement } from "@/components/announcements/types"
import { EmptyMonthState } from "@/components/announcements/StateViews"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function formatGroupLabel(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) return "Hoje"
  if (date.getTime() === tomorrow.getTime()) return "Amanhã"
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
}

export function AnnouncementAgendaList({
  announcements,
  onEventClick,
  onDayClick,
}: {
  announcements: Announcement[]
  onEventClick: (id: string) => void
  onDayClick: (dateISO: string) => void
}) {
  const reduced = useReducedMotion()

  if (announcements.length === 0) {
    return <EmptyMonthState />
  }

  const groups = new Map<string, Announcement[]>()
  for (const a of announcements) {
    const list = groups.get(a.date) ?? []
    list.push(a)
    groups.set(a.date, list)
  }
  const orderedDates = Array.from(groups.keys()).sort()

  return (
    <motion.div
      variants={listContainer(reduced)}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4 px-4 lg:px-6"
    >
      {orderedDates.map((dateISO) => {
        const items = groups.get(dateISO)!.sort((a, b) => a.time.localeCompare(b.time))
        return (
          <div key={dateISO} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium capitalize text-muted-foreground">
                {formatGroupLabel(dateISO)}
              </h3>
              <Button variant="ghost" size="icon-xs" onClick={() => onDayClick(dateISO)}>
                <PlusIcon />
                <span className="sr-only">Novo neste dia</span>
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((a) => (
                <motion.button
                  key={a.id}
                  type="button"
                  variants={listItem(reduced)}
                  onClick={() => onEventClick(a.id)}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center">
                    <span className="text-sm font-semibold tabular-nums">{a.time}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={a.type === "Evento" ? "default" : "secondary"}>
                        {a.type === "Evento" ? (
                          <PresentationIcon data-icon="inline-start" />
                        ) : (
                          <MegaphoneIcon data-icon="inline-start" />
                        )}
                        {a.type}
                      </Badge>
                    </div>
                    <span className="truncate text-sm font-medium">{a.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Responsável: {a.responsibleName}
                    </span>
                  </div>
                  <Avatar size="sm" className="shrink-0">
                    <AvatarFallback>{initials(a.responsibleName)}</AvatarFallback>
                  </Avatar>
                </motion.button>
              ))}
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}
