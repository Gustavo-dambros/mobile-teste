"use client"

import { AlertTriangleIcon } from "lucide-react"

import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"

export function RouteError({ reset }: { reset: () => void }) {
  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangleIcon className="size-8 text-destructive" />
        <h1 className="text-base font-semibold">Não foi possível carregar esta página</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Algo deu errado ao buscar os dados. Tente novamente em alguns instantes.
        </p>
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </DashboardShell>
  )
}
