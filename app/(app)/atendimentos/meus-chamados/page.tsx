import { DashboardShell } from "@/components/dashboard-shell"
import { TicketsPage } from "@/components/tickets/TicketsPage"

export default function Page() {
  return (
    <DashboardShell title="Meus Chamados">
      <TicketsPage />
    </DashboardShell>
  )
}
