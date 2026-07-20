import { DashboardShell } from "@/components/dashboard-shell"
import { TicketChatPage } from "@/components/tickets/chat/TicketChatPage"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <DashboardShell title="Chamado">
      <TicketChatPage ticketId={id} variant="queue" />
    </DashboardShell>
  )
}
