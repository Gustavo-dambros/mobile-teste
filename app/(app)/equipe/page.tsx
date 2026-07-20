import { DashboardShell } from "@/components/dashboard-shell"
import { TeamPage } from "@/components/team/TeamPage"
import { getTeamDirectory } from "@/lib/team/directory"

export default async function Page() {
  const members = await getTeamDirectory()

  return (
    <DashboardShell title="Equipe">
      <TeamPage members={members} />
    </DashboardShell>
  )
}
