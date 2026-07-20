"use client"

import * as React from "react"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export function TicketsPagination({
  page,
  totalPages,
  onPageChange,
  totalCount,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalCount: number
}) {
  const pageNumbers = React.useMemo(() => {
    const pages: (number | "ellipsis")[] = []
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
        pages.push(i)
      } else if (pages.at(-1) !== "ellipsis") {
        pages.push("ellipsis")
      }
    }
    return pages
  }, [totalPages, page])

  return (
    <div className="flex shrink-0 items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {totalCount} chamado(s) encontrado(s)
      </p>
      {totalPages > 1 && (
        <Pagination className="mx-0 w-fit">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text=""
                onClick={(e) => {
                  e.preventDefault()
                  onPageChange(Math.max(1, page - 1))
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {pageNumbers.map((n, i) =>
              n === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <span className="flex size-8 items-center justify-center text-muted-foreground">
                    …
                  </span>
                </PaginationItem>
              ) : (
                <PaginationItem key={n}>
                  <PaginationLink
                    href="#"
                    isActive={n === page}
                    onClick={(e) => {
                      e.preventDefault()
                      onPageChange(n)
                    }}
                  >
                    {n}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                text=""
                onClick={(e) => {
                  e.preventDefault()
                  onPageChange(Math.min(totalPages, page + 1))
                }}
                className={
                  page === totalPages ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
