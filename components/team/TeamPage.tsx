"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table"
import { FilterIcon, SearchIcon } from "lucide-react"

import { fadeIn, teamToolbar } from "@/lib/motion"
import type { DirectoryMember } from "@/lib/team/directory"
import { useTeamPresence } from "@/lib/team/presence-realtime"
import { teamFilterFields } from "@/components/team/types"
import { teamColumns } from "@/components/team/team-columns"
import { TeamTable } from "@/components/team/TeamTable"
import { TeamPagination } from "@/components/team/TeamPagination"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PAGE_SIZE = 15

function filterRows(
  rows: DirectoryMember[],
  field: string,
  query: string
): DirectoryMember[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    String((row as unknown as Record<string, unknown>)[field] ?? "")
      .toLowerCase()
      .includes(q)
  )
}

export function TeamPage({ members: initialMembers }: { members: DirectoryMember[] }) {
  const members = useTeamPresence(initialMembers)
  const reduced = useReducedMotion()
  const [query, setQuery] = React.useState("")
  const [field, setField] = React.useState("name")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const filtered = React.useMemo(
    () => filterRows(members, field, query),
    [members, field, query]
  )

  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [field, query])

  const activeFieldLabel = teamFilterFields.find((f) => f.value === field)?.label ?? ""

  const table = useReactTable({
    data: filtered,
    columns: teamColumns,
    state: { pagination },
    getRowId: (row) => row.id.toString(),
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const safePage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()

  return (
    <motion.div
      variants={fadeIn(reduced, 0.05)}
      initial="hidden"
      animate="show"
      className="flex h-full min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <motion.div
        variants={teamToolbar(reduced)}
        initial="hidden"
        animate="show"
        className="flex shrink-0 items-center gap-2"
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Label htmlFor="team-search" className="sr-only">
            Buscar colaborador
          </Label>
          <Input
            id="team-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar por ${activeFieldLabel.toLowerCase()}`}
            className="h-8 w-48 pl-8 sm:w-64"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <FilterIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Filtrar</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuRadioGroup value={field} onValueChange={setField}>
              <DropdownMenuLabel>Buscar por</DropdownMenuLabel>
              {teamFilterFields.map((f) => (
                <DropdownMenuRadioItem key={f.value} value={f.value}>
                  {f.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <TeamTable table={table} />
      </div>

      <TeamPagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={(n) => table.setPageIndex(n - 1)}
        totalCount={filtered.length}
      />
    </motion.div>
  )
}
