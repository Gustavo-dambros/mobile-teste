import type { ColumnDef } from "@tanstack/react-table"
import { EllipsisVerticalIcon, LockIcon, LockOpenIcon, PencilIcon, Trash2Icon } from "lucide-react"

import type { AdminUser } from "@/components/administracao/types"
import { LeaderBadge, RoleBadge, UserStatusBadge } from "@/components/administracao/users/AdminUserBadges"
import { formatDate } from "@/lib/administracao/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserColumnActions {
  onEdit: (user: AdminUser) => void
  onToggleBlock: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
  currentUserId: string
}

function UserRowActions({ user, onEdit, onToggleBlock, onDelete, currentUserId }: { user: AdminUser } & UserColumnActions) {
  const isSelf = user.id === currentUserId

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-open:bg-muted"
            size="icon"
          />
        }
      >
        <EllipsisVerticalIcon />
        <span className="sr-only">Abrir menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <PencilIcon data-icon="inline-start" />
          Editar usuário
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleBlock(user)} disabled={isSelf}>
          {user.status === "ACTIVE" ? (
            <>
              <LockIcon data-icon="inline-start" />
              Bloquear usuário
            </>
          ) : (
            <>
              <LockOpenIcon data-icon="inline-start" />
              Desbloquear usuário
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(user)} disabled={isSelf}>
          <Trash2Icon data-icon="inline-start" />
          Deletar usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getUserColumns(actions: UserColumnActions): ColumnDef<AdminUser>[] {
  return [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {row.original.id === actions.currentUserId && (
            <span className="text-xs text-muted-foreground">Você</span>
          )}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
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
      accessorKey: "phone",
      header: "Telefone",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone}</span>,
    },
    {
      accessorKey: "role",
      header: "Perfil",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "isSectorLeader",
      header: "Líder de setor",
      cell: ({ row }) => <LeaderBadge isLeader={row.original.isSectorLeader} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <UserRowActions user={row.original} {...actions} />,
    },
  ]
}
