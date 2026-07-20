import type { ReactNode } from "react"
import { AlertCircleIcon, InboxIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

export function TableRowsSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full max-w-40" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        {icon ?? <InboxIcon className="size-4 text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function ErrorState({
  title = "Não foi possível carregar os dados",
  description = "Ocorreu um erro inesperado. Tente novamente.",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircleIcon className="size-4 text-destructive" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
        Tentar novamente
      </Button>
    </div>
  )
}
