import { DashboardShell } from "@/components/dashboard-shell"
import { KanbanPage } from "@/components/kanban/KanbanPage"

export default function Page() {
  return (
    <DashboardShell>
      <KanbanPage />
    </DashboardShell>
  )
}
