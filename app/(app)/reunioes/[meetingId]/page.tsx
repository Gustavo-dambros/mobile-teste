import { DashboardShell } from "@/components/dashboard-shell"
import { AuthenticatedMeetingRoom } from "@/components/reunioes/AuthenticatedMeetingRoom"

export default async function Page({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  return (
    <DashboardShell title="Reunião">
      <AuthenticatedMeetingRoom meetingId={meetingId} />
    </DashboardShell>
  )
}
