import type { ComponentType } from "react"
import {
  BanIcon,
  Building2Icon,
  CoffeeIcon,
  GraduationCapIcon,
  HeadsetIcon,
  HomeIcon,
  PalmtreeIcon,
  UserRoundXIcon,
  VideoIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const presenceDotClass: Record<string, string> = {
  Online: "bg-green-500 dark:bg-green-400",
  Ocupado: "bg-red-500 dark:bg-red-400",
  Ausente: "bg-yellow-500 dark:bg-yellow-400",
  Offline: "bg-muted-foreground/40",
}

const activityIcon: Record<string, ComponentType<{ className?: string }>> = {
  Presencial: Building2Icon,
  "Home office": HomeIcon,
  Reunião: VideoIcon,
  Atendimento: HeadsetIcon,
  Intervalo: CoffeeIcon,
  Treinamento: GraduationCapIcon,
  Férias: PalmtreeIcon,
  Afastado: UserRoundXIcon,
  Indisponível: BanIcon,
}

export function PresenceBadge({ presence }: { presence: string }) {
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      <span className={cn("size-2 rounded-full", presenceDotClass[presence] ?? "bg-muted-foreground/40")} />
      {presence}
    </Badge>
  )
}

export function ActivityBadge({ activity }: { activity: string }) {
  const Icon = activityIcon[activity] ?? Building2Icon
  return (
    <Badge variant="outline" className="px-1.5 text-muted-foreground">
      <Icon className="size-3" />
      {activity}
    </Badge>
  )
}
