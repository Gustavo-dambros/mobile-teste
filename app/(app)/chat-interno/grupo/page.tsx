import { DashboardShell } from "@/components/dashboard-shell"
import { ChatInternoShell } from "@/components/chat-interno/ChatInternoShell"

export default function Page() {
  return (
    <DashboardShell title="Grupo">
      <ChatInternoShell scope="group" />
    </DashboardShell>
  )
}
