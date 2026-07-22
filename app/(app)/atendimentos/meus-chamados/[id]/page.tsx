import { DashboardShell } from "@/components/dashboard-shell"
import { TicketChatPage } from "@/components/tickets/chat/TicketChatPage"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <DashboardShell>
      <TicketChatPage ticketId={id} />
    </DashboardShell>
  )
}
