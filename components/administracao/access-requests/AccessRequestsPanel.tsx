"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { InboxIcon } from "lucide-react"

import { adminCardHover, adminCardTap, adminItemPop, adminPanelIn, adminStagger, microTap } from "@/lib/motion"
import { useAdministracao } from "@/lib/administracao/store"
import { formatDateTime } from "@/lib/administracao/format"
import type { AccessRequest } from "@/components/administracao/types"
import { AccessRequestViewDialog } from "@/components/administracao/access-requests/AccessRequestViewDialog"
import { EmptyState, ErrorState } from "@/components/administracao/DataStates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

export function AccessRequestsPanel() {
  const reduced = useReducedMotion()
  const { requests, pendingCount, status, retry } = useAdministracao()
  const [viewingRequest, setViewingRequest] = React.useState<AccessRequest | null>(null)

  // Approved/rejected requests disappear from the panel immediately — only
  // pending ones are actionable, so there's nothing left to do with them here.
  const sorted = React.useMemo(
    () =>
      requests
        .filter((r) => r.status === "PENDING")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests]
  )

  return (
    <motion.div
      variants={adminPanelIn(reduced, "left")}
      initial="hidden"
      animate="show"
      className="flex h-full min-h-0 w-full flex-col gap-3 lg:w-80 lg:shrink-0"
    >
      <div className="flex shrink-0 items-center gap-2">
        <h2 className="text-sm font-semibold">Solicitações de acesso</h2>
        {pendingCount > 0 && (
          <motion.div
            animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
            transition={reduced ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Badge variant="secondary">{pendingCount}</Badge>
          </motion.div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        {status === "loading" ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : status === "error" ? (
          <ErrorState
            onRetry={retry}
            description="Não foi possível carregar as solicitações de acesso."
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="size-4 text-muted-foreground" />}
            title="Nenhuma solicitação de acesso pendente."
          />
        ) : (
          <ScrollArea className="h-full">
            <motion.div
              variants={adminStagger(reduced)}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-2 p-3"
            >
              {sorted.map((request) => (
                <motion.div
                  key={request.id}
                  variants={adminItemPop(reduced)}
                  whileHover={reduced ? undefined : adminCardHover}
                  whileTap={reduced ? undefined : adminCardTap}
                  transition={microTap(reduced)}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{request.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{request.email}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="px-1.5 text-muted-foreground">
                        {request.sector}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(request.createdAt)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setViewingRequest(request)}
                  >
                    Ver
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          </ScrollArea>
        )}
      </div>

      <AccessRequestViewDialog
        request={viewingRequest}
        open={viewingRequest !== null}
        onOpenChange={(open) => !open && setViewingRequest(null)}
      />
    </motion.div>
  )
}
