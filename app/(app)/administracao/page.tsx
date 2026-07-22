import { DashboardShell } from "@/components/dashboard-shell"
import { AdministracaoPage } from "@/components/administracao/AdministracaoPage"

export default function Page() {
  return (
    <DashboardShell>
      <AdministracaoPage />
    </DashboardShell>
  )
}
