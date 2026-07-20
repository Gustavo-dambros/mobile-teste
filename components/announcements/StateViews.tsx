"use client"

import { motion, useReducedMotion } from "motion/react"
import { CalendarOffIcon, InboxIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react"

import { fadeIn } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 w-full" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={`c-${i}`} className="h-20 w-full" />
        ))}
      </div>
    </div>
  )
}

export function EmptyMonthState({ label = "Nenhum anúncio ou evento neste mês" }: { label?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={fadeIn(reduced, 0.1)}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <CalendarOffIcon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium">{label}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Publique um novo anúncio ou evento para que ele apareça aqui.
      </p>
    </motion.div>
  )
}

export function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlertIcon className="size-5 text-destructive" />
      </div>
      <h3 className="text-sm font-medium">Não foi possível carregar os anúncios e eventos</h3>
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

export function EmptyNotificationsState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <InboxIcon className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
    </div>
  )
}
