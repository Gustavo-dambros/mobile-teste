import { DashboardShell } from "@/components/dashboard-shell"
import { AnnouncementsPage } from "@/components/announcements/AnnouncementsPage"

export default function Page() {
  return (
    <DashboardShell title="Anúncios/Eventos">
      <AnnouncementsPage />
    </DashboardShell>
  )
}
