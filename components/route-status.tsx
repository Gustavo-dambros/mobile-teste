import { DashboardShell } from "@/components/dashboard-shell"
import { Skeleton } from "@/components/ui/skeleton"

export function RouteLoading({ title }: { title: string }) {
  return (
    <DashboardShell title={title}>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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
