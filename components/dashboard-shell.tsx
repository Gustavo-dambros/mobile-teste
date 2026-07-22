import type { ReactNode } from "react"

import { SiteHeader } from "@/components/site-header"

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
