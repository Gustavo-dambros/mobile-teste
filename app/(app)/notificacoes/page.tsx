import { DashboardShell } from "@/components/dashboard-shell"
import { SystemNotificationsPage } from "@/components/system-notifications/SystemNotificationsPage"
import NotificacoesMobilePage from "./mobile-page"

export default function Page() {
  return (
    <>
      <div className="md:hidden">
        <NotificacoesMobilePage />
      </div>
      <div className="hidden md:block">
        <DashboardShell>
          <SystemNotificationsPage />
        </DashboardShell>
      </div>
    </>
  )
}
