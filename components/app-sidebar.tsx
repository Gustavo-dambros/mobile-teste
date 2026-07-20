"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"

import { sidebarContainer, sidebarItem, hoverNudge, tapScale, microTap } from "@/lib/motion"
import { isAdmin } from "@/lib/session"
import { useCurrentUser } from "@/lib/current-user/context"
import { useAdministracao } from "@/lib/administracao/store"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  HeadsetIcon,
  InboxIcon,
  TicketIcon,
  HistoryIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  MessageCircleIcon,
  UsersIcon,
  UsersRoundIcon,
  BarChart3Icon,
  LandmarkIcon,
  WalletIcon,
  HandCoinsIcon,
  PresentationIcon,
  Columns3Icon,
  ListChecksIcon,
  CircleHelpIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "lucide-react"

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  {
    title: "Atendimentos",
    url: "/atendimentos",
    icon: <HeadsetIcon />,
    items: [
      { title: "Meus Chamados", url: "/atendimentos/meus-chamados", icon: <InboxIcon /> },
      { title: "Chamados", url: "/atendimentos/chamados", icon: <TicketIcon /> },
      { title: "Histórico", url: "/atendimentos/historico", icon: <HistoryIcon /> },
    ],
  },
  { title: "Equipe", url: "/equipe", icon: <UsersRoundIcon /> },
  { title: "Relatórios", url: "/relatorios", icon: <BarChart3Icon /> },
  { title: "Anúncios/Eventos", url: "/anuncios-eventos", icon: <MegaphoneIcon /> },
  {
    title: "Chat Interno",
    url: "/chat-interno",
    icon: <MessagesSquareIcon />,
    items: [
      { title: "Bate-papo", url: "/chat-interno/bate-papo", icon: <MessageCircleIcon /> },
      { title: "Grupo", url: "/chat-interno/grupo", icon: <UsersIcon /> },
    ],
  },
  { title: "Reuniões", url: "/reunioes", icon: <PresentationIcon /> },
  { title: "Kanban", url: "/kanban", icon: <Columns3Icon /> },
  { title: "Atividades do Setor", url: "/atividades-setor", icon: <ListChecksIcon /> },
  {
    title: "Empréstimos",
    url: "/emprestimos",
    icon: <LandmarkIcon />,
    items: [
      { title: "Meus Empréstimos", url: "/emprestimos/meus-emprestimos", icon: <WalletIcon /> },
      { title: "Realizar Empréstimo", url: "/emprestimos/realizar-emprestimo", icon: <HandCoinsIcon /> },
      { title: "Histórico", url: "/emprestimos/historico", icon: <HistoryIcon /> },
    ],
  },
]

const navSecondary = [
  { title: "Ajuda", url: "/ajuda", icon: <CircleHelpIcon /> },
  { title: "Ramal", url: "/ramal", icon: <PhoneIcon /> },
]

const ADMIN_URL = "/administracao"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const reduced = useReducedMotion()
  const pathname = usePathname()
  const currentUser = useCurrentUser()
  const { pendingCount } = useAdministracao()

  const navMainWithActive = navMain.map((item) => {
    if (item.items) {
      const subItemsWithActive = item.items.map((sub) => ({
        ...sub,
        isActive: pathname === sub.url,
      }))
      return {
        ...item,
        items: subItemsWithActive,
        isActive: subItemsWithActive.some((sub) => sub.isActive),
      }
    }
    return { ...item, isActive: pathname === item.url }
  })
  const navSecondaryWithActive = navSecondary.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }))
  const isAdminActive = pathname === ADMIN_URL

  return (
    <Sidebar collapsible="icon" {...props}>
      <motion.div
        variants={sidebarContainer(reduced)}
        initial="hidden"
        animate="show"
        className="flex h-full flex-col"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[slot=sidebar-menu-button]:p-1.5!"
                render={<Link href="/dashboard" />}
              >
                <motion.div
                  initial={reduced ? false : { scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex size-7! shrink-0 items-center justify-center"
                >
                  <Image
                    src="/logo.png"
                    alt="Unipar"
                    width={28}
                    height={28}
                    className="size-full object-contain"
                    priority
                  />
                </motion.div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-base font-extrabold uppercase">
                    Unipar-Cascavel
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Atendimentos
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navMainWithActive} />
          <NavSecondary items={navSecondaryWithActive} className="mt-auto" />
          {isAdmin(currentUser) && (
            <SidebarGroup className="pt-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <motion.div
                      variants={sidebarItem(reduced)}
                      whileHover={reduced ? undefined : hoverNudge}
                      whileTap={reduced ? undefined : tapScale}
                      transition={microTap(reduced)}
                    >
                      <SidebarMenuButton
                        tooltip="Administração"
                        isActive={isAdminActive}
                        render={<Link href={ADMIN_URL} />}
                        className="bg-brand text-brand-foreground duration-200 ease-linear hover:bg-brand/90 hover:text-brand-foreground active:bg-brand/90 active:text-brand-foreground data-active:bg-brand data-active:text-brand-foreground"
                      >
                        <ShieldCheckIcon />
                        <span>Administração</span>
                        {pendingCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-auto size-4 rounded-full px-1 tabular-nums"
                          >
                            {pendingCount}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </motion.div>
    </Sidebar>
  )
}
