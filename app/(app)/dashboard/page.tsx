import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { DashboardShell } from "@/components/dashboard-shell"
import { getDashboardChartSeries, getDashboardMetrics } from "@/lib/dashboard/server"
import { getCurrentUser } from "@/lib/session-server"
import { getTeamDirectory } from "@/lib/team/directory"

export default async function Page() {
  const user = await getCurrentUser()
  const [members, metrics, chartSeries] = await Promise.all([
    getTeamDirectory(),
    user ? getDashboardMetrics(user) : null,
    getDashboardChartSeries(),
  ])

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {metrics ? (
          <SectionCards metrics={metrics} />
        ) : (
          <p className="px-4 text-sm text-muted-foreground lg:px-6">
            Não foi possível carregar suas métricas agora.
          </p>
        )}
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive data={chartSeries} />
        </div>
        <DataTable data={members} />
      </div>
    </DashboardShell>
  )
}
