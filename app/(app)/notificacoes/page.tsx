import { DashboardShell } from "@/components/dashboard-shell"
import { SystemNotificationsPage } from "@/components/system-notifications/SystemNotificationsPage"

export default function Page() {
  return (
    <DashboardShell title="Notificações">
      <SystemNotificationsPage />
    </DashboardShell>
  )
}
