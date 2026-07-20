"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"

import { sidebarItem, hoverNudge, tapScale, microTap } from "@/lib/motion"
import { useCurrentUser } from "@/lib/current-user/context"
import { useTickets } from "@/lib/tickets/store"
import { useAnnouncements } from "@/lib/announcements/store"
import { useChatInterno } from "@/lib/chat-interno/store"
import { useKanban } from "@/lib/kanban/store"
import { useReunioes } from "@/lib/reunioes/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { CirclePlusIcon, MailIcon, ChevronRightIcon } from "lucide-react"

type NavSubItem = {
  title: string
  url: string
  icon?: React.ReactNode
  isActive?: boolean
  badge?: number
}

type NavItem = {
  title: string
  url: string
  isActive?: boolean
  icon?: React.ReactNode
  items?: NavSubItem[]
  badge?: number
}

function NavMainGroup({
  item,
  itemVariants,
  reduced,
}: {
  item: NavItem
  itemVariants: ReturnType<typeof sidebarItem>
  reduced: boolean | null
}) {
  const [open, setOpen] = React.useState(Boolean(item.isActive))

  return (
    <SidebarMenuItem>
      <motion.div
        variants={itemVariants}
        whileHover={reduced ? undefined : hoverNudge}
        whileTap={reduced ? undefined : tapScale}
        transition={microTap(reduced)}
      >
        <SidebarMenuButton
          tooltip={item.title}
          isActive={item.isActive}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="group/collapsible"
        >
          {item.icon}
          <span>{item.title}</span>
          <ChevronRightIcon
            className="ml-auto size-4 shrink-0 transition-transform duration-200 group-aria-expanded/collapsible:rotate-90"
          />
        </SidebarMenuButton>
      </motion.div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <SidebarMenuSub>
              {item.items?.map((sub) => (
                <SidebarMenuSubItem key={sub.title}>
                  <SidebarMenuSubButton
                    isActive={sub.isActive}
                    render={<Link href={sub.url} />}
                  >
                    {sub.icon}
                    <span>{sub.title}</span>
                    {!!sub.badge && (
                      <Badge
                        variant="destructive"
                        className="ml-auto size-4 rounded-full px-1 tabular-nums"
                      >
                        {sub.badge}
                      </Badge>
                    )}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarMenuItem>
  )
}

export function NavMain({ items }: { items: NavItem[] }) {
  const reduced = useReducedMotion()
  const itemVariants = sidebarItem(reduced)
  const currentUser = useCurrentUser()
  const { openCreateDialog, unreadTicketIds, tickets } = useTickets()
  const { sidebarUnreadCount } = useAnnouncements()
  const { unreadCount: kanbanUnreadCount } = useKanban()
  const { conversations, getUnreadCount: getChatUnreadCount } = useChatInterno()
  const { inviteNotifications } = useReunioes()

  // Unread invites — scheduled or already-active, cleared by responding (Aceitar/Recusar)
  // or by clicking "Ver detalhes" (see components/reunioes/MeetingInviteModal.tsx). "Fechar"
  // deliberately does NOT clear this — it stays counted until genuinely handled.
  const reunioesInviteCount = inviteNotifications.length

  const dmUnreadCount = conversations
    .filter((c) => c.kind === "dm" && !c.leftAt)
    .reduce((sum, c) => sum + getChatUnreadCount(c.id), 0)
  const groupUnreadCount = conversations
    .filter((c) => c.kind === "group" && !c.leftAt)
    .reduce((sum, c) => sum + getChatUnreadCount(c.id), 0)

  const queueUnreadCount = tickets.filter(
    (t) =>
      !t.deleted &&
      t.sector === currentUser?.sector &&
      t.status !== "Concluído" &&
      unreadTicketIds.includes(t.id)
  ).length

  const mineUnreadCount = tickets.filter(
    (t) => !t.deleted && t.requesterId === currentUser?.id && unreadTicketIds.includes(t.id)
  ).length

  const itemsWithBadges = items.map((item) => {
    if (item.url === "/anuncios-eventos") {
      return { ...item, badge: sidebarUnreadCount }
    }
    if (item.url === "/kanban") {
      return { ...item, badge: kanbanUnreadCount }
    }
    if (item.url === "/reunioes") {
      return { ...item, badge: reunioesInviteCount }
    }
    if (!item.items) return item
    return {
      ...item,
      items: item.items.map((sub) => {
        if (sub.url === "/atendimentos/meus-chamados") {
          return { ...sub, badge: mineUnreadCount }
        }
        if (sub.url === "/atendimentos/chamados") {
          return { ...sub, badge: queueUnreadCount }
        }
        if (sub.url === "/chat-interno/bate-papo") {
          return { ...sub, badge: dmUnreadCount }
        }
        if (sub.url === "/chat-interno/grupo") {
          return { ...sub, badge: groupUnreadCount }
        }
        return sub
      }),
    }
  })

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <motion.div
              className="flex-1"
              variants={itemVariants}
              whileHover={reduced ? undefined : { scale: 1.01 }}
              whileTap={reduced ? undefined : tapScale}
              transition={microTap(reduced)}
            >
              <SidebarMenuButton
                tooltip="Criação Rápida"
                onClick={openCreateDialog}
                className="min-w-8 bg-brand text-brand-foreground duration-200 ease-linear hover:bg-brand/90 hover:text-brand-foreground active:bg-brand/90 active:text-brand-foreground"
              >
                <CirclePlusIcon
                />
                <span>Criação Rápida</span>
              </SidebarMenuButton>
            </motion.div>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <MailIcon
              />
              <span className="sr-only">Caixa de Entrada</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {itemsWithBadges.map((item) =>
            item.items && item.items.length > 0 ? (
              <NavMainGroup
                key={item.title}
                item={item}
                itemVariants={itemVariants}
                reduced={reduced}
              />
            ) : (
              <SidebarMenuItem key={item.title}>
                <motion.div
                  variants={itemVariants}
                  whileHover={reduced ? undefined : hoverNudge}
                  whileTap={reduced ? undefined : tapScale}
                  transition={microTap(reduced)}
                >
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={item.isActive}
                    render={<Link href={item.url} />}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                    {!!item.badge && (
                      <Badge
                        variant="destructive"
                        className="ml-auto size-4 rounded-full px-1 tabular-nums"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
