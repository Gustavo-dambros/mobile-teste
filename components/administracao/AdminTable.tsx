"use client"

import type { ReactNode } from "react"
import { flexRender, type Table as TableInstance } from "@tanstack/react-table"
import { motion, useReducedMotion } from "motion/react"

import { adminRowPop, adminStagger } from "@/lib/motion"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function AnimatedRow({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.tr
      data-slot="table-row"
      variants={adminRowPop(reduced)}
      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
    >
      {children}
    </motion.tr>
  )
}

export function AdminTable<T>({
  table,
  emptyMessage,
}: {
  table: TableInstance<T>
  emptyMessage: string
}) {
  const reduced = useReducedMotion()
  const columnCount = table.getAllLeafColumns().length

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      <div className="overflow-y-auto">
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
            variants={adminStagger(reduced, 0.04)}
            initial="hidden"
            animate="show"
          >
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <AnimatedRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </AnimatedRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </motion.tbody>
        </Table>
      </div>
    </div>
  )
}
