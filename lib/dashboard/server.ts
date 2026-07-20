import "server-only"

import type { SessionUser } from "@/lib/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { OVERDUE_HOURS } from "@/lib/tickets/status-badge"

export interface DashboardMetric {
  value: number
  /** Percentage change vs. the same metric last calendar month, or null if there's no meaningful baseline to compare against. */
  trendPercent: number | null
}

export interface DashboardMetrics {
  openInSector: DashboardMetric
  inProgressMine: DashboardMetric
  completedThisMonthMine: DashboardMetric
  completionRateMine: DashboardMetric
  overdueInSector: DashboardMetric
}

export interface DashboardChartPoint {
  date: string
  abertos: number
  encerrados: number
}

function monthRange(monthsAgo: number) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 1))
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Null (shown as "Sem histórico") rather than a fake "+100%" when there's no
 * real baseline to compare against — a 0→N jump isn't a meaningful percentage. */
function trend(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export async function getDashboardMetrics(user: SessionUser): Promise<DashboardMetrics> {
  const admin = createAdminClient()
  const thisMonth = monthRange(0)
  const lastMonth = monthRange(1)
  const overdueCutoff = new Date(Date.now() - OVERDUE_HOURS * 60 * 60 * 1000).toISOString()

  const [
    openInSectorNow,
    inProgressMineNow,
    completedThisMonth,
    completedLastMonth,
    openInSectorThisMonth,
    openInSectorLastMonth,
    overdueInSectorNow,
  ] = await Promise.all([
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .eq("status", "Aberto")
      .eq("sector", user.sector),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .eq("status", "Em andamento")
      .eq("assignee_id", user.id),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .eq("status", "Concluído")
      .eq("closed_by_id", user.id)
      .gte("updated_at", thisMonth.start)
      .lt("updated_at", thisMonth.end),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .eq("status", "Concluído")
      .eq("closed_by_id", user.id)
      .gte("updated_at", lastMonth.start)
      .lt("updated_at", lastMonth.end),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .eq("sector", user.sector)
      .gte("created_at", thisMonth.start)
      .lt("created_at", thisMonth.end),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .eq("sector", user.sector)
      .gte("created_at", lastMonth.start)
      .lt("created_at", lastMonth.end),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .eq("sector", user.sector)
      .in("status", ["Aberto", "Em andamento"])
      .is("first_response_at", null)
      .lt("created_at", overdueCutoff),
  ])

  for (const result of [
    openInSectorNow,
    inProgressMineNow,
    completedThisMonth,
    completedLastMonth,
    openInSectorThisMonth,
    openInSectorLastMonth,
    overdueInSectorNow,
  ]) {
    if (result.error) throw new Error(result.error.message)
  }

  const completedThisMonthCount = completedThisMonth.count ?? 0
  const completedLastMonthCount = completedLastMonth.count ?? 0
  const inProgressMineNowCount = inProgressMineNow.count ?? 0

  // Same cohort on both sides — of what I've touched this month (finished +
  // still in progress), how much did I finish. Naturally bounded at 100%,
  // unlike comparing "closed this month" against "assigned this month by
  // creation date" (two different populations that could put this over 100%).
  const completionRateDenominator = completedThisMonthCount + inProgressMineNowCount
  const rateThisMonth =
    completionRateDenominator === 0
      ? 0
      : Math.round((completedThisMonthCount / completionRateDenominator) * 100)

  return {
    openInSector: {
      value: openInSectorNow.count ?? 0,
      trendPercent: trend(openInSectorThisMonth.count ?? 0, openInSectorLastMonth.count ?? 0),
    },
    inProgressMine: {
      value: inProgressMineNowCount,
      // No historical snapshot of "in progress" exists to compare against.
      trendPercent: null,
    },
    completedThisMonthMine: {
      value: completedThisMonthCount,
      trendPercent: trend(completedThisMonthCount, completedLastMonthCount),
    },
    completionRateMine: {
      value: rateThisMonth,
      // Same reason as inProgressMine — no reliable past-month snapshot.
      trendPercent: null,
    },
    overdueInSector: {
      value: overdueInSectorNow.count ?? 0,
      trendPercent: null,
    },
  }
}

/** Daily open/closed ticket activity for the last 90 days, company-wide. */
export async function getDashboardChartSeries(): Promise<DashboardChartPoint[]> {
  const admin = createAdminClient()
  const days = 90
  const now = new Date()
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  start.setUTCHours(0, 0, 0, 0)

  const [openedResult, closedResult] = await Promise.all([
    admin.from("tickets").select("created_at").eq("deleted", false).gte("created_at", start.toISOString()),
    admin
      .from("tickets")
      .select("updated_at")
      .eq("deleted", false)
      .eq("status", "Concluído")
      .gte("updated_at", start.toISOString()),
  ])
  if (openedResult.error) throw new Error(openedResult.error.message)
  if (closedResult.error) throw new Error(closedResult.error.message)

  const abertosByDay = new Map<string, number>()
  for (const row of openedResult.data ?? []) {
    const key = row.created_at.slice(0, 10)
    abertosByDay.set(key, (abertosByDay.get(key) ?? 0) + 1)
  }
  const encerradosByDay = new Map<string, number>()
  for (const row of closedResult.data ?? []) {
    const key = row.updated_at.slice(0, 10)
    encerradosByDay.set(key, (encerradosByDay.get(key) ?? 0) + 1)
  }

  const points: DashboardChartPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    points.push({
      date: key,
      abertos: abertosByDay.get(key) ?? 0,
      encerrados: encerradosByDay.get(key) ?? 0,
    })
  }
  return points
}
