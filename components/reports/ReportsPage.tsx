"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react"

import { pageHeader } from "@/lib/motion"
import { isAdmin } from "@/lib/session"
import { useCurrentUser } from "@/lib/current-user/context"
import { useTickets } from "@/lib/tickets/store"
import type { DirectoryMember } from "@/lib/team/directory"
import {
  countClosedInPeriod,
  countClosedInPreviousPeriod,
  filterTicketsByPeriod,
  filterTicketsByPreviousPeriod,
  getDailyTrend,
  getPriorityDistribution,
  getSectorDistribution,
  getStatusDistribution,
  getTeamActivityDistribution,
  getTeamPresenceDistribution,
  getTicketMetrics,
  reportPeriodItems,
  sortTicketsByCreatedAtDesc,
  type ReportPeriod,
} from "@/lib/reports/derive"
import { exportReportPdf, exportReportXlsx } from "@/components/reports/export"
import { ReportMetricCards } from "@/components/reports/ReportMetricCards"
import { TicketsTrendChart } from "@/components/reports/TicketsTrendChart"
import { TicketBreakdownCharts } from "@/components/reports/TicketBreakdownCharts"
import { TeamInsightCharts } from "@/components/reports/TeamInsightCharts"
import { ReportsTable } from "@/components/reports/ReportsTable"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ReportsPage({ teamMembers }: { teamMembers: DirectoryMember[] }) {
  const reduced = useReducedMotion()
  const currentUser = useCurrentUser()
  // The "Equipe" sheet in the Excel export bundles every employee's email
  // and phone in one file — each is already visible one-at-a-time to any
  // logged-in user on the Equipe page, but bulk-exporting the whole company
  // directory is restricted to admin/sector leaders.
  const canExportTeamContacts = isAdmin(currentUser) || !!currentUser?.isSectorLeader
  const { tickets: allTickets } = useTickets()
  const tickets = React.useMemo(() => allTickets.filter((t) => !t.deleted), [allTickets])
  const [period, setPeriod] = React.useState<ReportPeriod>("30d")
  const [isExporting, setIsExporting] = React.useState<"pdf" | "xlsx" | null>(null)

  const periodLabel =
    reportPeriodItems.find((item) => item.value === period)?.label ?? "Últimos 30 dias"

  const filteredTickets = React.useMemo(
    () => sortTicketsByCreatedAtDesc(filterTicketsByPeriod(tickets, period)),
    [tickets, period]
  )
  const previousPeriodTickets = React.useMemo(
    () => filterTicketsByPreviousPeriod(tickets, period),
    [tickets, period]
  )

  // "Concluídos" is displayed as "Encerrados no período" — that has to be
  // closed-date-based, computed over the full ticket list, not the
  // createdAt-filtered set (a ticket opened before the window but closed
  // inside it must still count). taxaConclusao keeps its existing meaning
  // ("of tickets opened this period, how many are done"), unaffected.
  const metrics = React.useMemo(
    () => ({ ...getTicketMetrics(filteredTickets), concluidos: countClosedInPeriod(tickets, period) }),
    [filteredTickets, tickets, period]
  )
  const previousMetrics = React.useMemo(
    () => ({
      ...getTicketMetrics(previousPeriodTickets),
      concluidos: countClosedInPreviousPeriod(tickets, period),
    }),
    [previousPeriodTickets, tickets, period]
  )

  const dailyTrend = React.useMemo(
    () => getDailyTrend(filteredTickets, tickets, period),
    [filteredTickets, tickets, period]
  )
  const sectorData = React.useMemo(() => getSectorDistribution(filteredTickets), [filteredTickets])
  const priorityData = React.useMemo(
    () => getPriorityDistribution(filteredTickets),
    [filteredTickets]
  )
  const statusData = React.useMemo(() => getStatusDistribution(filteredTickets), [filteredTickets])
  const activityData = React.useMemo(() => getTeamActivityDistribution(teamMembers), [teamMembers])
  const presenceData = React.useMemo(() => getTeamPresenceDistribution(teamMembers), [teamMembers])

  async function handleExport(format: "pdf" | "xlsx") {
    setIsExporting(format)
    try {
      const bundle = {
        periodLabel,
        generatedAt: new Date(),
        metrics,
        sectorData,
        priorityData,
        statusData,
        activityData,
        presenceData,
        tickets: filteredTickets,
        team: canExportTeamContacts ? teamMembers : [],
      }
      if (format === "pdf") {
        await exportReportPdf(bundle)
        toast.success("Relatório PDF gerado com sucesso")
      } else {
        await exportReportXlsx(bundle)
        toast.success("Relatório Excel gerado com sucesso")
      }
    } catch {
      toast.error("Não foi possível gerar o relatório. Tente novamente.")
    } finally {
      setIsExporting(null)
    }
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
          <h2 className="text-lg font-semibold">Visão geral operacional</h2>
          <p className="text-sm text-muted-foreground">
            Chamados de atendimento e atividades da equipe dentro do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
            <SelectTrigger className="w-44" size="sm" aria-label="Selecione o período">
              <SelectValue placeholder="Período">
                {(value: ReportPeriod) =>
                  reportPeriodItems.find((item) => item.value === value)?.label ?? "Período"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {reportPeriodItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" disabled={isExporting !== null} />}
            >
              {isExporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
              Exportar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={isExporting !== null}>
                <FileTextIcon data-icon="inline-start" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("xlsx")}
                disabled={isExporting !== null}
              >
                <FileSpreadsheetIcon data-icon="inline-start" />
                Exportar Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      <ReportMetricCards metrics={metrics} previousMetrics={previousMetrics} />

      <div className="px-4 lg:px-6">
        <TicketsTrendChart data={dailyTrend} period={period} />
      </div>

      <TicketBreakdownCharts
        sectorData={sectorData}
        priorityData={priorityData}
        statusData={statusData}
      />

      <TeamInsightCharts activityData={activityData} presenceData={presenceData} />

      <ReportsTable tickets={filteredTickets} />
    </div>
  )
}
