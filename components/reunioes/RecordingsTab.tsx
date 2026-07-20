"use client"

import * as React from "react"
import { toast } from "sonner"
import { DownloadIcon, FilmIcon, PlayIcon } from "lucide-react"

import type { MeetingRecording } from "@/lib/reunioes/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const STATUS_LABEL: Record<MeetingRecording["status"], string> = {
  recording: "Gravando",
  processing: "Processando",
  ready: "Pronta",
  failed: "Falhou",
  expired: "Expirada",
}

function formatSize(bytes?: number) {
  if (!bytes) return null
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`
}

function formatDuration(seconds?: number) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function timeRemaining(expiresAt?: string) {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "Expira em instantes"
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return hours > 0 ? `Expira em ${hours}h${minutes > 0 ? ` ${minutes}min` : ""}` : `Expira em ${minutes}min`
}

async function openRecording(id: string, mode: "watch" | "download", title: string) {
  try {
    const res = await fetch(`/api/reunioes/recordings/${id}/download`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
    if (mode === "download") {
      // The signed URL is on Supabase Storage's own origin — browsers ignore <a download>
      // for cross-origin resources, so clicking would just open the video in a new tab
      // instead of saving it. Fetching the bytes first gives us a same-origin blob: URL,
      // which download always respects regardless of where the data came from.
      const fileRes = await fetch(data.url)
      if (!fileRes.ok) throw new Error("Não foi possível baixar o arquivo da gravação")
      const blob = await fileRes.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `${title}.mp4`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } else {
      window.open(data.url, "_blank", "noopener,noreferrer")
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Não foi possível abrir a gravação")
  }
}

export function RecordingsTab() {
  const [recordings, setRecordings] = React.useState<MeetingRecording[] | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/reunioes/recordings")
        const data = await res.json()
        if (!cancelled && res.ok) setRecordings(data.recordings ?? [])
      } catch {
        if (!cancelled) setRecordings([])
      }
    }

    load()
    const interval = window.setInterval(load, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  if (recordings === null) return null

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
        <FilmIcon className="size-6 text-muted-foreground" />
        <h3 className="text-sm font-medium">Nenhuma gravação disponível</h3>
        <p className="text-sm text-muted-foreground">
          Grave uma reunião pelo botão de gravação na sala — as gravações ficam disponíveis por 24 horas.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {recordings.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate text-sm font-medium">{r.meetingTitle}</h3>
              <Badge variant={r.status === "ready" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                {STATUS_LABEL[r.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(r.startedAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              {" · "}
              Organizador: {r.startedByName || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {[formatDuration(r.durationSeconds), formatSize(r.fileSizeBytes)].filter(Boolean).join(" · ") || "—"}
              {r.status === "ready" && r.expiresAt && <> · {timeRemaining(r.expiresAt)}</>}
            </p>
            {r.status === "ready" && (
              <div className="mt-1 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openRecording(r.id, "watch", r.meetingTitle)}>
                  <PlayIcon data-icon="inline-start" /> Assistir
                </Button>
                <Button size="sm" variant="outline" onClick={() => openRecording(r.id, "download", r.meetingTitle)}>
                  <DownloadIcon data-icon="inline-start" /> Baixar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
