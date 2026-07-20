"use client"

import type { ComponentType, ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  InboxIcon,
  RefreshCwIcon,
  ShieldOffIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { fadeIn } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4 lg:px-6" aria-hidden>
      {Array.from({ length: 3 }).map((_, col) => (
        <div key={col} className="flex w-72 shrink-0 flex-col gap-2.5">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 3 }).map((_, card) => (
            <Skeleton key={card} className="h-28 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({
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

export function EmptyNotificationsState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <InboxIcon className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
    </div>
  )
}

export function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlertIcon className="size-5 text-destructive" />
      </div>
      <h3 className="text-sm font-medium">Não foi possível carregar a agenda</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Verifique sua conexão e tente novamente.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCwIcon data-icon="inline-start" />
        Tentar novamente
      </Button>
    </div>
  )
}

export function NoPermissionState({
  title = "Sem permissão",
  description = "Você não tem acesso a este conteúdo.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ShieldOffIcon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
