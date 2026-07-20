import { DashboardShell } from "@/components/dashboard-shell"
import { ReportsPage } from "@/components/reports/ReportsPage"
import { getTeamDirectory } from "@/lib/team/directory"

export default async function Page() {
  const teamMembers = await getTeamDirectory()

  return (
    <DashboardShell title="Relatórios">
      <ReportsPage teamMembers={teamMembers} />
    </DashboardShell>
  )
}
