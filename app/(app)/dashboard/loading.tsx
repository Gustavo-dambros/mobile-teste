import { DashboardShell } from "@/components/dashboard-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <DashboardShell title="Dashboard">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="px-4 lg:px-6">
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="px-4 lg:px-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </DashboardShell>
  )
}
