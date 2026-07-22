import { DashboardShell } from "@/components/dashboard-shell"
import { ChatInternoShell } from "@/components/chat-interno/ChatInternoShell"

export default function Page() {
  return (
    <DashboardShell>
      <ChatInternoShell scope="group" />
    </DashboardShell>
  )
}
