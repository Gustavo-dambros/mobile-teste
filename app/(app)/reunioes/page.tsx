import { DashboardShell } from "@/components/dashboard-shell"
import { ReunioesPage } from "@/components/reunioes/ReunioesPage"

export default function Page() {
  return (
    <DashboardShell>
      <ReunioesPage />
    </DashboardShell>
  )
}
