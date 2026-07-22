"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"

import { RouteIcon } from "@/components/animate-ui/icons/route"
import { HammerIcon } from "@/components/animate-ui/icons/hammer"
import { CirclePlusIcon } from "@/components/animate-ui/icons/circle-plus"
import { MessageCircleMoreIcon } from "@/components/animate-ui/icons/message-circle-more"
import { ClipboardListIcon } from "@/components/animate-ui/icons/clipboard-list"

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  id: string
  isCreate?: boolean
}

const navItems: NavItem[] = [
  { label: "Empréstimo", icon: RouteIcon, href: "/emprestimos", id: "emprestimos" },
  { label: "Atendimentos", icon: HammerIcon, href: "/atendimentos", id: "atendimentos" },
  { label: "Criar Chamado", icon: CirclePlusIcon, href: "/atendimentos/criar", id: "criar", isCreate: true },
  { label: "Comunicação", icon: MessageCircleMoreIcon, href: "/chat-interno", id: "comunicacao" },
  { label: "Tarefas", icon: ClipboardListIcon, href: "/kanban", id: "tarefas" },
]

const hiddenRoutes = [
  "/atendimentos/criar",
  "/teste-navbar",
  "/perfil",
  "/notificacoes",
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selected, setSelected] = React.useState<string | null>(null)

  const hasConversation = searchParams.get("conversationId") !== null

  React.useEffect(() => {
    setSelected(null)
  }, [pathname])

  function handleClick(item: NavItem) {
    setSelected(item.id)
    router.push(item.href)
  }

  function isItemActive(item: NavItem) {
    if (selected) {
      return selected === item.id
    }
    if (item.isCreate) return false
    if (item.id === "atendimentos") {
      return pathname.startsWith("/atendimentos") && !pathname.startsWith("/atendimentos/criar")
    }
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  const shouldHide = hiddenRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))
  const isInChat = pathname.startsWith("/chat-interno") && hasConversation

  if (shouldHide || isInChat) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card z-50 md:hidden">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isItemActive(item)

          if (item.isCreate) {
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200",
                    active
                      ? "bg-primary shadow-lg shadow-primary/30"
                      : "bg-muted border border-border"
                  )}
                >
                  <Icon
                    size={28}
                    className={cn(
                      "transition-colors duration-200",
                      active ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                </motion.div>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active
                  ? "text-brand"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={20} className={active ? "text-brand" : ""} />
              <span className={cn("text-[10px]", active && "font-semibold")}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
