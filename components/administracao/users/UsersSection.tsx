"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table"
import { FilterIcon, SearchIcon, XIcon } from "lucide-react"

import { adminPanelIn, teamToolbar } from "@/lib/motion"
import { useAdministracao } from "@/lib/administracao/store"
import { sectorOptions } from "@/components/sector-select"
import type { AdminUser } from "@/components/administracao/types"
import { leaderFilterItems, roleItems, userStatusItems } from "@/components/administracao/types"
import { getUserColumns } from "@/components/administracao/users/user-columns"
import { UserEditDialog } from "@/components/administracao/users/UserEditDialog"
import { UserBlockDialog } from "@/components/administracao/users/UserBlockDialog"
import { UserDeleteDialog } from "@/components/administracao/users/UserDeleteDialog"
import { UsersPagination } from "@/components/administracao/users/UsersPagination"
import { AdminTable } from "@/components/administracao/AdminTable"
import { EmptyState, ErrorState, TableRowsSkeleton } from "@/components/administracao/DataStates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"

const PAGE_SIZE = 15

export function UsersSection() {
  const reduced = useReducedMotion()
  const { users, currentUserId, status, retry } = useAdministracao()

  const [query, setQuery] = React.useState("")
  const [sector, setSector] = React.useState("all")
  const [role, setRole] = React.useState("all")
  const [leader, setLeader] = React.useState("all")
  const [accountStatus, setAccountStatus] = React.useState("all")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null)
  const [blockingUser, setBlockingUser] = React.useState<AdminUser | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<AdminUser | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
        return false
      }
      if (sector !== "all" && u.sector !== sector) return false
      if (role !== "all" && u.role !== role) return false
      if (leader === "leader" && !u.isSectorLeader) return false
      if (leader === "not-leader" && u.isSectorLeader) return false
      if (accountStatus !== "all" && u.status !== accountStatus) return false
      return true
    })
  }, [users, query, sector, role, leader, accountStatus])

  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [query, sector, role, leader, accountStatus])

  const columns = React.useMemo(
    () =>
      getUserColumns({
        currentUserId,
        onEdit: setEditingUser,
        onToggleBlock: setBlockingUser,
        onDelete: setDeletingUser,
      }),
    [currentUserId]
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination },
    getRowId: (row) => row.id,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const activeFilterCount = [sector, role, leader, accountStatus].filter((v) => v !== "all").length
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0

  function clearFilters() {
    setQuery("")
    setSector("all")
    setRole("all")
    setLeader("all")
    setAccountStatus("all")
  }

  const safePage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()
  const columnCount = columns.length

  return (
    <motion.div
      variants={adminPanelIn(reduced, "right", 0.08)}
      initial="hidden"
      animate="show"
      className="flex h-full min-h-0 flex-1 flex-col gap-4"
    >
      <motion.div
        variants={teamToolbar(reduced)}
        initial="hidden"
        animate="show"
        className="flex shrink-0 items-center gap-2"
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Label htmlFor="user-search" className="sr-only">
            Buscar por nome ou e-mail
          </Label>
          <Input
            id="user-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="h-8 w-48 pl-8 sm:w-64"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="relative" />}>
            <FilterIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Filtrar</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 size-4 rounded-full px-1 tabular-nums">
                {activeFilterCount}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuRadioGroup value={sector} onValueChange={(v) => v && setSector(v)}>
              <DropdownMenuLabel>Setor</DropdownMenuLabel>
              <DropdownMenuRadioItem value="all">Todos os setores</DropdownMenuRadioItem>
              {sectorOptions.map((s) => (
                <DropdownMenuRadioItem key={s.value} value={s.value}>
                  {s.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={role} onValueChange={(v) => v && setRole(v)}>
              <DropdownMenuLabel>Perfil</DropdownMenuLabel>
              <DropdownMenuRadioItem value="all">Todos os perfis</DropdownMenuRadioItem>
              {roleItems.map((r) => (
                <DropdownMenuRadioItem key={r.value} value={r.value}>
                  {r.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={leader} onValueChange={(v) => v && setLeader(v)}>
              <DropdownMenuLabel>Liderança</DropdownMenuLabel>
              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
              {leaderFilterItems.map((l) => (
                <DropdownMenuRadioItem key={l.value} value={l.value}>
                  {l.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={accountStatus} onValueChange={(v) => v && setAccountStatus(v)}>
              <DropdownMenuLabel>Status da conta</DropdownMenuLabel>
              <DropdownMenuRadioItem value="all">Todos os status</DropdownMenuRadioItem>
              {userStatusItems.map((s) => (
                <DropdownMenuRadioItem key={s.value} value={s.value}>
                  {s.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon data-icon="inline-start" />
            Limpar
          </Button>
        )}
      </motion.div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        {status === "loading" ? (
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                {columns.map((_, i) => (
                  <th key={i} className="h-10 px-2" />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton columns={columnCount} />
            </TableBody>
          </Table>
        ) : status === "error" ? (
          <ErrorState onRetry={retry} description="Não foi possível carregar os usuários." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum usuário foi encontrado com os filtros selecionados."
            description={hasActiveFilters ? "Tente ajustar a busca ou os filtros aplicados." : undefined}
          />
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            <AdminTable table={table} emptyMessage="Nenhum usuário encontrado." />
          </div>
        )}
      </div>

      <UsersPagination
        page={safePage}
        totalPages={Math.max(totalPages, 1)}
        totalCount={filtered.length}
        onPageChange={(n) => table.setPageIndex(n - 1)}
      />

      <UserEditDialog user={editingUser} open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)} />
      <UserBlockDialog user={blockingUser} open={blockingUser !== null} onOpenChange={(open) => !open && setBlockingUser(null)} />
      <UserDeleteDialog user={deletingUser} open={deletingUser !== null} onOpenChange={(open) => !open && setDeletingUser(null)} />
    </motion.div>
  )
}
