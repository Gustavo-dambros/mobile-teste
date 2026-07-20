"use client"

import type { ComponentType, ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArchiveIcon, InboxIcon, KanbanSquareIcon, PaperclipIcon, SearchXIcon, SparklesIcon } from "lucide-react"

import { fadeIn } from "@/lib/motion"
import { Skeleton } from "@/components/ui/skeleton"

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4 pb-2 lg:px-6" aria-hidden>
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="flex w-72 shrink-0 flex-col gap-2.5">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 3 }).map((_, card) => (
            <Skeleton key={card} className="h-24 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function KanbanEmptyState({
  icon: Icon = SparklesIcon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={fadeIn(reduced, 0.1)}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </motion.div>
  )
}

export function NoBoardsState({ action }: { action?: ReactNode }) {
  return (
    <KanbanEmptyState
      icon={KanbanSquareIcon}
      title="Você ainda não criou nenhum quadro"
      description="Crie seu primeiro quadro para começar a organizar suas atividades e sua rotina diária."
      action={action}
    />
  )
}

export function NoSearchResultsState({ action }: { action?: ReactNode }) {
  return (
    <KanbanEmptyState
      icon={SearchXIcon}
      title="Nenhum resultado encontrado"
      description="Ajuste a pesquisa ou os filtros aplicados para ver mais atividades."
      action={action}
    />
  )
}

export function EmptyNotificationsState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <InboxIcon className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
    </div>
  )
}

export function EmptyArchiveState() {
  return (
    <KanbanEmptyState
      icon={ArchiveIcon}
      title="Nenhum item arquivado"
      description="Itens arquivados de quadros, colunas e atividades aparecerão aqui."
    />
  )
}

export function EmptyAttachmentsState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
      <PaperclipIcon className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nenhum anexo nesta atividade.</p>
    </div>
  )
}
