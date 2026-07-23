"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"

import {
  LandmarkIcon,
  HeadsetIcon,
  CirclePlusIcon,
  MessagesSquareIcon,
  Columns3Icon,
  BarChart3Icon,
  ListChecksIcon,
  ArrowLeftRightIcon,
} from "lucide-react"

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  id: string
  isCreate?: boolean
}

const navItems: NavItem[] = [
  { label: "Comunicação", icon: MessagesSquareIcon, href: "/chat-interno", id: "comunicacao" },
  { label: "Atendimentos", icon: HeadsetIcon, href: "/atendimentos", id: "atendimentos" },
  { label: "Criar Chamado", icon: CirclePlusIcon, href: "/atendimentos/criar", id: "criar", isCreate: true },
  { label: "Kanban", icon: Columns3Icon, href: "/kanban", id: "tarefas" },
]

const navItemsPage2: NavItem[] = [
  { label: "Relatórios", icon: BarChart3Icon, href: "/relatorios", id: "relatorios" },
  { label: "Atividades", icon: ListChecksIcon, href: "/atividades-setor", id: "atividades" },
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
  const [page, setPage] = React.useState<0 | 1>(0)
  const [direction, setDirection] = React.useState<1 | -1>(1)

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
  const isDashboard = pathname === "/dashboard" || pathname === "/"

  if (shouldHide || isInChat || !isDashboard) return null

  const currentItems = page === 0 ? navItems : navItemsPage2

  function togglePage() {
    setDirection(page === 0 ? 1 : -1)
    setPage(page === 0 ? 1 : 0)
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <nav className="flex items-center justify-around h-16 px-2 border-t border-border bg-card">
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex items-center justify-around w-full"
          >
            {currentItems.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item)

              if (item.isCreate) {
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    className="flex flex-col items-center justify-center -mt-8"
                  >
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 shadow-lg shadow-red-600/40 transition-all duration-200"
                    >
                      <Icon
                        size={30}
                        className="text-white transition-colors duration-200"
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
            <button
              onClick={togglePage}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRightIcon size={20} />
              <span className="text-[10px]">{page === 0 ? "Mais" : "Ver menos"}</span>
            </button>
          </motion.div>
        </AnimatePresence>
      </nav>
    </div>
  )
}
