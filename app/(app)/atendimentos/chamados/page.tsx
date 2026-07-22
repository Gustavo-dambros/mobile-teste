import { DashboardShell } from "@/components/dashboard-shell"
import { QueueTicketsPage } from "@/components/tickets/QueueTicketsPage"

export default function Page() {
  return (
    <DashboardShell>
      <QueueTicketsPage />
    </DashboardShell>
  )
}
