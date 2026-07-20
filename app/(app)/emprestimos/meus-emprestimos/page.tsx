import { DashboardShell } from "@/components/dashboard-shell"
import { ComingSoon } from "@/components/coming-soon"

export default function Page() {
  return (
    <DashboardShell title="Meus Empréstimos">
      <ComingSoon label="Meus Empréstimos" />
    </DashboardShell>
  )
}
