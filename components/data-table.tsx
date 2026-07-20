"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type Table as TableInstance,
} from "@tanstack/react-table"

import { fadeIn, tableContainer, tableRow } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/current-user/context"
import type { Ticket } from "@/components/tickets/types"
import { formatDate, formatTime } from "@/lib/tickets/format"
import { useTickets } from "@/lib/tickets/store"
import { TicketStatusBadge } from "@/lib/tickets/status-badge"
import { TicketActionsMenu } from "@/components/tickets/TicketActionsMenu"
import { UnreadBadge } from "@/components/tickets/UnreadBadge"
import { EditTicketDialog } from "@/components/tickets/EditTicketDialog"
import { CloseTicketDialog } from "@/components/tickets/CloseTicketDialog"
import { DeleteTicketDialog } from "@/components/tickets/DeleteTicketDialog"
import { ReopenTicketDialog } from "@/components/tickets/ReopenTicketDialog"
import { teamFilterFields } from "@/components/team/types"
import { teamColumns } from "@/components/team/team-columns"
import type { DirectoryMember } from "@/lib/team/directory"
import { useTeamPresence } from "@/lib/team/presence-realtime"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { FilterIcon, SearchIcon } from "lucide-react"

// ---------------------------------------------------------------------------
// Meus Chamados — real tickets, shared with /atendimentos/meus-chamados
// (same data, same edit/close/delete dialogs, same row-click-to-chat).
// ---------------------------------------------------------------------------

function buildTicketColumns({
  onOpenChat,
  onEdit,
  onClose,
  onReopen,
  onDelete,
  getUnreadCount,
}: {
  onOpenChat: (ticket: Ticket) => void
  onEdit: (ticket: Ticket) => void
  onClose: (ticket: Ticket) => void
  onReopen: (ticket: Ticket) => void
  onDelete: (ticket: Ticket) => void
  getUnreadCount: (ticketId: string) => number
}): ColumnDef<Ticket>[] {
  return [
    {
      accessorKey: "number",
      header: "Número",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.number}</span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <span className="flex max-w-64 items-center gap-2 font-medium">
          <UnreadBadge count={getUnreadCount(row.original.id)} />
          <span className="truncate">{row.original.title}</span>
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "assignee",
      header: "Responsável",
      cell: ({ row }) =>
        row.original.assignee ? (
          <span>{row.original.assignee}</span>
        ) : (
          <span className="text-muted-foreground italic">
            Aguardando atribuição
          </span>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <TicketStatusBadge ticket={row.original} />,
    },
    {
      accessorKey: "priority",
      header: "Prioridade",
      cell: ({ row }) => {
        const p = row.original.priority
        return (
          <Badge
            variant={p === "Alta" ? "destructive" : p === "Média" ? "secondary" : "outline"}
            className="px-1.5"
          >
            {p}
          </Badge>
        )
      },
    },
    {
      id: "openedDate",
      header: "Aberto em",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "openedTime",
      header: "Horário",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <TicketActionsMenu
          isClosed={row.original.status === "Concluído"}
          onReply={() => onOpenChat(row.original)}
          onEdit={() => onEdit(row.original)}
          onClose={() => onClose(row.original)}
          onReopen={() => onReopen(row.original)}
          onDelete={() => onDelete(row.original)}
        />
      ),
    },
  ]
}

const chamadoFilterFields = [
  { value: "title", label: "Título" },
  { value: "number", label: "Número" },
  { value: "assignee", label: "Responsável" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Prioridade" },
]

// ---------------------------------------------------------------------------
// Shared table chrome (search, table body, pagination) — same design/size
// reused across the two tabs.
// ---------------------------------------------------------------------------

function filterRows<T extends object>(rows: T[], field: string, query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    String((row as Record<string, unknown>)[field] ?? "")
      .toLowerCase()
      .includes(q)
  )
}

function AnimatedRow({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  const reduced = useReducedMotion()
  return (
    <motion.tr
      data-slot="table-row"
      variants={tableRow(reduced)}
      onClick={onClick}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        onClick && "cursor-pointer"
      )}
    >
      {children}
    </motion.tr>
  )
}

function SectionTable<TData>({
  table,
  onRowClick,
}: {
  table: TableInstance<TData>
  onRowClick?: (row: TData) => void
}) {
  const reduced = useReducedMotion()
  const columnCount = table.getAllLeafColumns().length
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <motion.tbody
          data-slot="table-body"
          className="[&_tr:last-child]:border-0"
          variants={tableContainer(reduced)}
          initial="hidden"
          animate="show"
        >
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <AnimatedRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </AnimatedRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                Nenhum resultado.
              </TableCell>
            </TableRow>
          )}
        </motion.tbody>
      </Table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ViewValue = "team" | "chamados"

const viewItems = [
  { label: "Equipe", value: "team" },
  { label: "Meus Chamados", value: "chamados" },
]

export function DataTable({ data: initialTeamData }: { data: DirectoryMember[] }) {
  const reduced = useReducedMotion()
  const router = useRouter()
  const currentUser = useCurrentUser()
  const [view, setView] = React.useState<ViewValue>("team")

  const teamData = useTeamPresence(initialTeamData)
  const [teamQuery, setTeamQuery] = React.useState("")
  const [teamField, setTeamField] = React.useState("name")
  const [teamPagination, setTeamPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { tickets: realTickets, getUnreadCount } = useTickets()
  const [editingTicket, setEditingTicket] = React.useState<Ticket | null>(null)
  const [closingTicket, setClosingTicket] = React.useState<Ticket | null>(null)
  const [deletingTicket, setDeletingTicket] = React.useState<Ticket | null>(null)
  const [reopeningTicket, setReopeningTicket] = React.useState<Ticket | null>(null)
  // "Meus Chamados" — mine as requester, matching /atendimentos/meus-chamados
  // (components/tickets/TicketsPage.tsx), not everything in my sector/company.
  const chamadosState = React.useMemo(
    () => realTickets.filter((t) => !t.deleted && t.requesterId === currentUser?.id),
    [realTickets, currentUser?.id]
  )
  const [chamadoQuery, setChamadoQuery] = React.useState("")
  const [chamadoField, setChamadoField] = React.useState("title")
  const [chamadoPagination, setChamadoPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const openChat = React.useCallback(
    (ticket: Ticket) => router.push(`/atendimentos/meus-chamados/${ticket.id}`),
    [router]
  )
  const ticketColumns = React.useMemo(
    () =>
      buildTicketColumns({
        onOpenChat: openChat,
        onEdit: setEditingTicket,
        onClose: setClosingTicket,
        onReopen: setReopeningTicket,
        onDelete: setDeletingTicket,
        getUnreadCount,
      }),
    [openChat, getUnreadCount]
  )

  const filteredTeam = React.useMemo(
    () => filterRows(teamData, teamField, teamQuery),
    [teamData, teamField, teamQuery]
  )
  const filteredChamados = React.useMemo(
    () => filterRows(chamadosState, chamadoField, chamadoQuery),
    [chamadosState, chamadoField, chamadoQuery]
  )

  const teamTable = useReactTable({
    data: filteredTeam,
    columns: teamColumns,
    state: { pagination: teamPagination },
    getRowId: (row) => row.id.toString(),
    onPaginationChange: setTeamPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const chamadosTable = useReactTable({
    data: filteredChamados,
    columns: ticketColumns,
    state: { pagination: chamadoPagination },
    getRowId: (row) => row.id,
    onPaginationChange: setChamadoPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const openChamados = chamadosState.filter((c) => c.status !== "Concluído").length

  const searchConfig =
    view === "team"
      ? { fields: teamFilterFields, query: teamQuery, setQuery: setTeamQuery, field: teamField, setField: setTeamField }
      : { fields: chamadoFilterFields, query: chamadoQuery, setQuery: setChamadoQuery, field: chamadoField, setField: setChamadoField }

  const activeFieldLabel = searchConfig.fields.find((f) => f.value === searchConfig.field)?.label ?? ""

  return (
    <motion.div
      variants={fadeIn(reduced, 0.95)}
      initial="hidden"
      animate="show"
    >
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as ViewValue)}
        className="w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            Visualização
          </Label>
          <Select
            value={view}
            onValueChange={(value) => setView(value as ViewValue)}
            items={viewItems}
          >
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="view-selector"
            >
              <SelectValue placeholder="Selecione uma visualização" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {viewItems.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="team">Equipe</TabsTrigger>
            <TabsTrigger value="chamados">
              Meus Chamados <Badge variant="secondary">{openChamados}</Badge>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Label htmlFor="table-search" className="sr-only">
                Buscar
              </Label>
              <Input
                id="table-search"
                value={searchConfig.query}
                onChange={(e) => searchConfig.setQuery(e.target.value)}
                placeholder={`Buscar por ${activeFieldLabel.toLowerCase()}`}
                className="h-8 w-36 pl-8 sm:w-52"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <FilterIcon data-icon="inline-start" />
                <span className="hidden lg:inline">Filtrar</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuRadioGroup
                  value={searchConfig.field}
                  onValueChange={searchConfig.setField}
                >
                  <DropdownMenuLabel>Buscar por</DropdownMenuLabel>
                  {searchConfig.fields.map((f) => (
                    <DropdownMenuRadioItem key={f.value} value={f.value}>
                      {f.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <TabsContent
          value="team"
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <SectionTable table={teamTable} />
          <DataTablePagination table={teamTable} idPrefix="team" />
        </TabsContent>
        <TabsContent
          value="chamados"
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <SectionTable table={chamadosTable} onRowClick={openChat} />
          <DataTablePagination table={chamadosTable} idPrefix="chamados" />
        </TabsContent>
      </Tabs>
      <EditTicketDialog
        ticket={editingTicket}
        onOpenChange={(open) => !open && setEditingTicket(null)}
      />
      <CloseTicketDialog
        ticket={closingTicket}
        onOpenChange={(open) => !open && setClosingTicket(null)}
      />
      <DeleteTicketDialog
        ticket={deletingTicket}
        onOpenChange={(open) => !open && setDeletingTicket(null)}
      />
      <ReopenTicketDialog
        ticket={reopeningTicket}
        onOpenChange={(open) => !open && setReopeningTicket(null)}
      />
    </motion.div>
  )
}
