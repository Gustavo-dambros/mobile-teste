import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react"

import type { AccessRequestStatus } from "@/components/administracao/types"
import { Badge } from "@/components/ui/badge"

const config: Record<
  AccessRequestStatus,
  { label: string; icon: typeof ClockIcon; className: string }
> = {
  PENDING: {
    label: "Pendente",
    icon: ClockIcon,
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  },
  APPROVED: {
    label: "Aprovada",
    icon: CheckCircle2Icon,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Rejeitada",
    icon: XCircleIcon,
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  },
}

export function RequestStatusBadge({ status }: { status: AccessRequestStatus }) {
  const { label, icon: Icon, className } = config[status]
  return (
    <Badge variant="outline" className={className}>
      <Icon />
      {label}
    </Badge>
  )
}
