import type { Ticket, TicketPriority, TicketSector, TicketStatus } from "@/components/tickets/types"
import type { DirectoryMember } from "@/lib/team/directory"

export type ReportPeriod = "7d" | "30d" | "90d"

export const reportPeriodItems: { value: ReportPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 3 meses" },
]

function periodDays(period: ReportPeriod) {
  return period === "7d" ? 7 : period === "30d" ? 30 : 90
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function filterTicketsByPeriod(
  tickets: Ticket[],
  period: ReportPeriod,
  referenceDate = new Date()
): Ticket[] {
  const start = startOfDay(referenceDate)
  start.setDate(start.getDate() - periodDays(period))
  return tickets.filter((t) => new Date(t.createdAt) >= start)
}

/** Same-length window immediately before the current one, for trend deltas. */
export function filterTicketsByPreviousPeriod(
  tickets: Ticket[],
  period: ReportPeriod,
  referenceDate = new Date()
): Ticket[] {
  const days = periodDays(period)
  const end = startOfDay(referenceDate)
  end.setDate(end.getDate() - days)
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return tickets.filter((t) => {
    const createdAt = new Date(t.createdAt)
    return createdAt >= start && createdAt < end
  })
}

/**
 * "Concluídos" is shown as "Encerrados no período" — that has to mean closed
 * within the window, not created within it. A ticket opened well before the
 * period but closed inside it must count here even though
 * filterTicketsByPeriod (createdAt-based) would exclude it — so this always
 * runs over the full ticket list, not the period-filtered one.
 */
export function countClosedInPeriod(
  tickets: Ticket[],
  period: ReportPeriod,
  referenceDate = new Date()
): number {
  const start = startOfDay(referenceDate)
  start.setDate(start.getDate() - periodDays(period))
  return tickets.filter((t) => t.status === "Concluído" && new Date(t.updatedAt) >= start).length
}

/** Same-length window immediately before the current one, for the Concluídos delta. */
export function countClosedInPreviousPeriod(
  tickets: Ticket[],
  period: ReportPeriod,
  referenceDate = new Date()
): number {
  const days = periodDays(period)
  const end = startOfDay(referenceDate)
  end.setDate(end.getDate() - days)
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return tickets.filter((t) => {
    if (t.status !== "Concluído") return false
    const updatedAt = new Date(t.updatedAt)
    return updatedAt >= start && updatedAt < end
  }).length
}

export interface TicketMetrics {
  total: number
  abertos: number
  emAndamento: number
  concluidos: number
  taxaConclusao: number
}

export function getTicketMetrics(tickets: Ticket[]): TicketMetrics {
  const total = tickets.length
  const abertos = tickets.filter((t) => t.status === "Aberto").length
  const emAndamento = tickets.filter((t) => t.status === "Em andamento").length
  const concluidos = tickets.filter((t) => t.status === "Concluído").length
  const taxaConclusao = total === 0 ? 0 : Math.round((concluidos / total) * 100)
  return { total, abertos, emAndamento, concluidos, taxaConclusao }
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export interface DailyTrendPoint {
  date: string
  criados: number
  concluidos: number
}

/** Wider bucket for longer periods keeps the trend readable instead of a noisy zigzag. */
function bucketSizeDays(period: ReportPeriod) {
  if (period === "7d") return 1
  if (period === "30d") return 3
  return 7
}

export function getDailyTrend(
  createdTickets: Ticket[],
  allTickets: Ticket[],
  period: ReportPeriod,
  referenceDate = new Date()
): DailyTrendPoint[] {
  const totalDays = periodDays(period)
  const bucket = bucketSizeDays(period)
  const bucketCount = Math.ceil(totalDays / bucket)

  const rangeStart = startOfDay(referenceDate)
  rangeStart.setDate(rangeStart.getDate() - (bucketCount - 1) * bucket)

  const points: DailyTrendPoint[] = []
  for (let i = 0; i < bucketCount; i++) {
    const bucketEnd = new Date(rangeStart)
    bucketEnd.setDate(bucketEnd.getDate() + i * bucket)
    points.push({ date: bucketEnd.toISOString().slice(0, 10), criados: 0, concluidos: 0 })
  }

  function bucketIndexForDate(date: Date) {
    const day = startOfDay(date)
    const diffDays = Math.round((day.getTime() - rangeStart.getTime()) / 86_400_000)
    if (diffDays < 0) return null
    const index = Math.floor(diffDays / bucket)
    return index >= 0 && index < bucketCount ? index : null
  }

  for (const t of createdTickets) {
    const createdIndex = bucketIndexForDate(new Date(t.createdAt))
    if (createdIndex !== null) points[createdIndex].criados += 1
  }
  // Runs over the full ticket list, not createdTickets — a ticket opened
  // before the window but closed inside it must still show up as a
  // completion on the day it closed (see countClosedInPeriod above).
  for (const t of allTickets) {
    if (t.status !== "Concluído") continue
    const closedIndex = bucketIndexForDate(new Date(t.updatedAt))
    if (closedIndex !== null) points[closedIndex].concluidos += 1
  }

  return points
}

export interface CategoryCount {
  key: string
  label: string
  total: number
}

export const sectorOrder: TicketSector[] = [
  "SP-Suporte Técnico",
  "RH-Recursos Humanos",
  "ADM-Administração",
  "SEP-Serviços Escola Psicologia",
]
export const priorityOrder: TicketPriority[] = ["Alta", "Média", "Baixa"]
export const statusOrder: TicketStatus[] = ["Aberto", "Em andamento", "Concluído"]
export const activityOrder = [
  "Presencial",
  "Home office",
  "Reunião",
  "Atendimento",
  "Intervalo",
  "Treinamento",
  "Férias",
  "Afastado",
  "Indisponível",
]
export const presenceOrder = ["Online", "Ocupado", "Ausente", "Offline"]

export function getSectorDistribution(tickets: Ticket[]): CategoryCount[] {
  return sectorOrder.map((sector) => ({
    key: sector,
    label: sector,
    total: tickets.filter((t) => t.sector === sector).length,
  }))
}

export function getPriorityDistribution(tickets: Ticket[]): CategoryCount[] {
  return priorityOrder.map((priority) => ({
    key: priority,
    label: priority,
    total: tickets.filter((t) => t.priority === priority).length,
  }))
}

export function getStatusDistribution(tickets: Ticket[]): CategoryCount[] {
  return statusOrder.map((status) => ({
    key: status,
    label: status,
    total: tickets.filter((t) => t.status === status).length,
  }))
}

export function getTeamActivityDistribution(team: DirectoryMember[]): CategoryCount[] {
  return activityOrder.map((activity) => ({
    key: activity,
    label: activity,
    total: team.filter((m) => m.activity === activity).length,
  }))
}

export function getTeamPresenceDistribution(team: DirectoryMember[]): CategoryCount[] {
  return presenceOrder.map((presence) => ({
    key: presence,
    label: presence,
    total: team.filter((m) => m.presence === presence).length,
  }))
}

export function sortTicketsByCreatedAtDesc(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
