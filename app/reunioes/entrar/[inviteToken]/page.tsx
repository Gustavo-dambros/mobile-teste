import { ReunioesProvider } from "@/lib/reunioes/store"
import { GuestMeetingFlow } from "@/components/reunioes/GuestMeetingFlow"
import { CurrentUserProvider } from "@/lib/current-user/context"

export default async function Page({
  params,
}: {
  params: Promise<{ inviteToken: string }>
}) {
  const { inviteToken } = await params
  return (
    <CurrentUserProvider user={null}>
      <ReunioesProvider guest>
        <GuestMeetingFlow inviteToken={inviteToken} />
      </ReunioesProvider>
    </CurrentUserProvider>
  )
}
