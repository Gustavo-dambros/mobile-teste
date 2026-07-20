import type { ReactNode } from "react"

import { SiteHeader } from "@/components/site-header"

export function DashboardShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <>
      <SiteHeader title={title} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
          {children}
        </div>
      </div>
    </>
  )
}
