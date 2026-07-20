import { DashboardShell } from "@/components/dashboard-shell"
import { ComingSoon } from "@/components/coming-soon"

export default function Page() {
  return (
    <DashboardShell title="Ideias">
      <ComingSoon label="Ideias" />
    </DashboardShell>
  )
}
