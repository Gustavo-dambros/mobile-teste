import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import BottomNav from "@/components/bottom-navigation"
import { TicketsProvider } from "@/lib/tickets/store"
import { AnnouncementsProvider } from "@/lib/announcements/store"
import { KanbanProvider } from "@/lib/kanban/store"
import { ProfileProvider } from "@/lib/profile/store"
import { ReunioesProvider } from "@/lib/reunioes/store"
import { ChatInternoProvider } from "@/lib/chat-interno/store"
import { AdministracaoProvider } from "@/lib/administracao/store"
import { SystemNotificationsProvider } from "@/lib/system-notifications/store"
import { ExtensionsProvider } from "@/lib/extensions/store"
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog"
import { NotificationCenterModal } from "@/components/announcements/NotificationCenterModal"
import { KanbanNotificationModal } from "@/components/kanban/KanbanNotificationModal"
import { MeetingInviteModal } from "@/components/reunioes/MeetingInviteModal"
import { GlobalCallOverlay } from "@/components/chat-interno/GlobalCallOverlay"
import { ProfileModal } from "@/components/profile/ProfileModal"
import { TeamHeartbeat } from "@/components/team/TeamHeartbeat"
import { getCurrentUser } from "@/lib/session-server"
import { CurrentUserProvider } from "@/lib/current-user/context"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <CurrentUserProvider user={user}>
      <TeamHeartbeat />
      <ProfileProvider>
        <TicketsProvider>
          <AnnouncementsProvider>
            <KanbanProvider>
              <ReunioesProvider>
                <ChatInternoProvider>
                  <AdministracaoProvider>
                    <SystemNotificationsProvider>
                      <ExtensionsProvider>
                        <SidebarProvider
                          style={
                            {
                              "--sidebar-width": "calc(var(--spacing) * 72)",
                              "--header-height": "calc(var(--spacing) * 12)",
                            } as CSSProperties
                          }
                        >
                          <AppSidebar variant="inset" />
                          <SidebarInset>{children}</SidebarInset>
                          <BottomNav />
                        </SidebarProvider>
                      </ExtensionsProvider>
                    </SystemNotificationsProvider>
                  </AdministracaoProvider>
                  <GlobalCallOverlay />
                </ChatInternoProvider>
                <MeetingInviteModal />
              </ReunioesProvider>
              <NotificationCenterModal />
              <KanbanNotificationModal />
            </KanbanProvider>
          </AnnouncementsProvider>
          <CreateTicketDialog />
        </TicketsProvider>
        <ProfileModal />
      </ProfileProvider>
    </CurrentUserProvider>
  )
}
