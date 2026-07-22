import { DashboardShell } from "@/components/dashboard-shell"
import { HistoryTicketsPage } from "@/components/tickets/HistoryTicketsPage"

export default function Page() {
  return (
    <DashboardShell>
      <HistoryTicketsPage />
    </DashboardShell>
  )
}
