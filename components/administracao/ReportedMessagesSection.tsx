"use client"

import * as React from "react"
import { FlagIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ReportedMessage {
  id: string
  reason: string
  description?: string
  createdAt: string
  reporterName: string
  messageText: string
  messageAuthorName: string
  ticketId?: string
  ticketNumber?: string
  ticketTitle?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ReportedMessagesSection() {
  const [reports, setReports] = React.useState<ReportedMessage[]>([])
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading")

  React.useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/administracao/reported-messages")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
        setReports(data.reports)
        setStatus("success")
      } catch {
        setStatus("error")
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (status === "loading") {
    return <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
  }
  if (status === "error") {
    return <p className="p-4 text-sm text-destructive">Não foi possível carregar as denúncias.</p>
  }
  if (reports.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <FlagIcon className="size-8" />
        <p className="text-sm">Nenhuma denúncia registrada.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle className="text-sm">
              {report.ticketNumber ? `${report.ticketNumber} — ${report.ticketTitle}` : "Chamado não encontrado"}
            </CardTitle>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(report.createdAt)}</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive">{report.reason}</Badge>
              <span className="text-muted-foreground">
                denunciado por {report.reporterName}, mensagem de {report.messageAuthorName}
              </span>
            </div>
            <p className="rounded-md bg-muted p-2 text-muted-foreground italic">&quot;{report.messageText}&quot;</p>
            {report.description && <p className="text-muted-foreground">{report.description}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
