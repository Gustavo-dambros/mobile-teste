"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { PlusIcon } from "lucide-react"

import { pageHeader } from "@/lib/motion"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAnnouncements } from "@/lib/announcements/store"
import { AnnouncementAgendaList } from "@/components/announcements/AnnouncementAgendaList"
import { AnnouncementCalendar } from "@/components/announcements/AnnouncementCalendar"
import { AnnouncementDetailSheet } from "@/components/announcements/AnnouncementDetailSheet"
import { AnnouncementFormDialog } from "@/components/announcements/AnnouncementFormDialog"
import { AnnouncementNotificationBell } from "@/components/announcements/AnnouncementNotificationBell"
import { DeleteAnnouncementDialog } from "@/components/announcements/DeleteAnnouncementDialog"
import { CalendarSkeleton, EmptyMonthState } from "@/components/announcements/StateViews"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type CalendarView = "month" | "agenda"

export function AnnouncementsPage() {
  const reduced = useReducedMotion()
  const isMobile = useIsMobile()
  const { visibleAnnouncements, openCreateDialog, openDetail } = useAnnouncements()

  const [month, setMonth] = React.useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [view, setView] = React.useState<CalendarView>("month")
  const [autoViewApplied, setAutoViewApplied] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const t = window.setTimeout(() => setIsLoading(false), 450)
    return () => window.clearTimeout(t)
  }, [])

  // Default to the agenda view on mobile the first time it's detected,
  // without fighting a manual tab switch the user makes afterwards.
  if (isMobile && !autoViewApplied) {
    setAutoViewApplied(true)
    setView("agenda")
  }

  const monthAnnouncements = React.useMemo(() => {
    const y = month.getFullYear()
    const m = month.getMonth()
    return visibleAnnouncements.filter((a) => {
      const d = new Date(`${a.date}T00:00:00`)
      return d.getFullYear() === y && d.getMonth() === m
    })
  }, [visibleAnnouncements, month])

  function handleDayClick(dateISO: string) {
    openCreateDialog(dateISO)
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <motion.div
        variants={pageHeader(reduced, 0.05)}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6"
      >
        <div>
          <h2 className="text-lg font-semibold">Anúncios e eventos</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe comunicados e compromissos da empresa em um único calendário
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
          <AnnouncementNotificationBell />
          <Button size="sm" onClick={() => openCreateDialog()}>
            <PlusIcon data-icon="inline-start" />
            Novo
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : view === "month" ? (
        <>
          <AnnouncementCalendar
            month={month}
            onMonthChange={setMonth}
            announcements={monthAnnouncements}
            onDayClick={handleDayClick}
            onEventClick={openDetail}
          />
          {monthAnnouncements.length === 0 && <EmptyMonthState />}
        </>
      ) : (
        <AnnouncementAgendaList
          announcements={monthAnnouncements}
          onEventClick={openDetail}
          onDayClick={handleDayClick}
        />
      )}

      <AnnouncementFormDialog />
      <AnnouncementDetailSheet />
      <DeleteAnnouncementDialog />
    </div>
  )
}
