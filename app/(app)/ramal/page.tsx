import { DashboardShell } from "@/components/dashboard-shell"
import { RamalList } from "@/components/ramal/RamalList"

export default function Page() {
  return (
    <DashboardShell title="Ramal">
      <RamalList />
    </DashboardShell>
  )
}
