import { cn } from "@/lib/utils"
import type { PresenceStatus } from "@/components/profile/types"
import { presenceItems } from "@/components/profile/types"

export function PresenceDot({
  status,
  className,
}: {
  status: PresenceStatus
  className?: string
}) {
  const dotClassName = presenceItems.find((p) => p.value === status)?.dotClassName
  return <span className={cn("size-2 rounded-full", dotClassName, className)} />
}
