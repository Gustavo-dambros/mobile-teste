"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table"

import { fadeIn, tableContainer, tableRow } from "@/lib/motion"
import { TicketStatusBadge } from "@/lib/tickets/status-badge"
import type { Ticket } from "@/components/tickets/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  return (
    <Badge
      variant={
        priority === "Alta" ? "destructive" : priority === "Média" ? "secondary" : "outline"
      }
      className="px-1.5"
    >
      {priority}
    </Badge>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "number",
    header: "Número",
    cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
  },
  {
    accessorKey: "title",
    header: "Título",
    cell: ({ row }) => <span className="block max-w-64 truncate">{row.original.title}</span>,
  },
  {
    accessorKey: "sector",
    header: "Setor",
  },
  {
    accessorKey: "priority",
    header: "Prioridade",
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <TicketStatusBadge ticket={row.original} />,
  },
  {
    id: "createdAt",
    header: "Criado em",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
    ),
  },
]

export function ReportsTable({ tickets }: { tickets: Ticket[] }) {
  const reduced = useReducedMotion()
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [tickets])

  const table = useReactTable({
    data: tickets,
    columns,
    state: { pagination },
    getRowId: (row) => row.id,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <motion.div
      variants={fadeIn(reduced, 0.55)}
      initial="hidden"
      animate="show"
      className="px-4 lg:px-6"
    >
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Chamados no Período</CardTitle>
          <CardDescription>
            {tickets.length} chamado(s) encontrado(s) — ordenados do mais recente
          </CardDescription>
        </CardHeader>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
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
              variants={tableContainer(reduced, 0.05)}
              initial="hidden"
              animate="show"
            >
              {rows.length ? (
                rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    variants={tableRow(reduced)}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Nenhum chamado encontrado neste período.
                  </TableCell>
                </TableRow>
              )}
            </motion.tbody>
          </Table>
        </div>
        <div className="pt-4">
          <DataTablePagination table={table} idPrefix="reports" />
        </div>
      </Card>
    </motion.div>
  )
}
