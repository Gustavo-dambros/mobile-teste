import type { ColumnDef } from "@tanstack/react-table"
import { CrownIcon, ShieldCheckIcon, UserIcon } from "lucide-react"

import type { DirectoryMember } from "@/lib/team/directory"
import { ActivityBadge, PresenceBadge } from "@/components/team/TeamBadges"
import { TeamMemberViewer, TeamRowActions } from "@/components/team/TeamMemberViewer"
import { Badge } from "@/components/ui/badge"

export const teamColumns: ColumnDef<DirectoryMember>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <TeamMemberViewer item={row.original} />
        {row.original.isSectorLeader && (
          <span title="Líder do setor">
            <CrownIcon className="size-3.5 shrink-0 text-amber-500" aria-label="Líder do setor" />
          </span>
        )}
      </span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "E-mail",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Telefone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone}</span>
    ),
  },
  {
    accessorKey: "sector",
    header: "Setor",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.sector}
      </Badge>
    ),
  },
  {
    accessorKey: "role",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.role === "Admin" ? "default" : "outline"} className="px-1.5">
        {row.original.role === "Admin" ? <ShieldCheckIcon /> : <UserIcon />}
        {row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: "presence",
    header: "Presença",
    cell: ({ row }) => <PresenceBadge presence={row.original.presence} />,
  },
  {
    accessorKey: "activity",
    header: "Atividade",
    cell: ({ row }) => <ActivityBadge activity={row.original.activity} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <TeamRowActions member={row.original} />,
  },
]
