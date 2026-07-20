import { CrownIcon, ShieldCheckIcon, UserIcon } from "lucide-react"

import type { UserRole, UserStatus } from "@/components/administracao/types"
import { Badge } from "@/components/ui/badge"

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={role === "ADMIN" ? "default" : "outline"} className="px-1.5">
      {role === "ADMIN" ? <ShieldCheckIcon /> : <UserIcon />}
      {role === "ADMIN" ? "Administrador" : "Usuário"}
    </Badge>
  )
}

export function LeaderBadge({ isLeader }: { isLeader: boolean }) {
  if (!isLeader) {
    return <span className="text-sm text-muted-foreground">Não</span>
  }
  return (
    <Badge variant="outline" className="border-violet-200 bg-violet-50 px-1.5 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400">
      <CrownIcon />
      Sim
    </Badge>
  )
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "ACTIVE"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
      }
    >
      {status === "ACTIVE" ? "Ativo" : "Bloqueado"}
    </Badge>
  )
}
