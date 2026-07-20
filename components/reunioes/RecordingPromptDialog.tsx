"use client"

import * as React from "react"
import { toast } from "sonner"
import { DownloadIcon, FilmIcon, Loader2Icon } from "lucide-react"

import type { MeetingRecordingSummary } from "@/lib/reunioes/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const POLL_INTERVAL_MS = 3_000

type RecordingState = MeetingRecordingSummary | null

/**
 * Shown right as someone leaves a recorded meeting (individually, or because the host
 * ended it for everyone) — offers an immediate download, or "not now" (the recording
 * stays reachable later from the Gravações tab either way, this is just a shortcut).
 * Works for guests too: the status fetch is meetingId+participantId authenticated, not
 * session-based (see app/api/reunioes/[id]/recording/route.ts).
 */
export function RecordingPromptDialog({
  open,
  onOpenChange,
  meetingId,
  participantId,
  meetingTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  participantId: string
  meetingTitle: string
}) {
  const [recording, setRecording] = React.useState<RecordingState>(null)
  const [url, setUrl] = React.useState<string | null>(null)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setLoaded(false)
      return
    }
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(
          `/api/reunioes/${meetingId}/recording?participantId=${encodeURIComponent(participantId)}`
        )
        const data = await res.json()
        if (cancelled || !res.ok) return
        setRecording(data.recording ?? null)
        setUrl(data.url ?? null)
        setLoaded(true)
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }

    poll()
    const stillPending = recording?.status === "recording" || recording?.status === "processing"
    const interval = stillPending || !loaded ? window.setInterval(poll, POLL_INTERVAL_MS) : undefined
    return () => {
      cancelled = true
      if (interval) window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meetingId, participantId, recording?.status])

  const [downloading, setDownloading] = React.useState(false)

  async function handleDownload() {
    if (!url) return
    setDownloading(true)
    try {
      // Same cross-origin <a download> caveat as RecordingsTab — fetch the bytes into a
      // same-origin blob: URL first so the browser actually saves the file instead of
      // just opening it in a new tab.
      const fileRes = await fetch(url)
      if (!fileRes.ok) throw new Error()
      const blob = await fileRes.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `${meetingTitle}.mp4`
      a.click()
      URL.revokeObjectURL(blobUrl)
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível baixar a gravação")
    } finally {
      setDownloading(false)
    }
  }

  const isReady = recording?.status === "ready" && url
  const isPending = !loaded || recording?.status === "recording" || recording?.status === "processing"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilmIcon className="size-4" /> Gravação da reunião
          </DialogTitle>
          <DialogDescription>
            {!loaded
              ? "Verificando a gravação..."
              : isReady
                ? "Esta reunião foi gravada e a gravação já está pronta."
                : isPending
                  ? "Esta reunião foi gravada — a gravação ainda está sendo processada. Ela vai aparecer na aba Gravações assim que estiver pronta."
                  : "Não foi possível preparar a gravação desta reunião."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isReady ? "Agora não" : "Entendi"}
          </Button>
          {isReady && (
            <Button type="button" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <DownloadIcon data-icon="inline-start" />
              )}
              {downloading ? "Baixando..." : "Baixar gravação"}
            </Button>
          )}
          {isPending && loaded && (
            <Button type="button" variant="outline" disabled>
              <Loader2Icon className="animate-spin" data-icon="inline-start" /> Processando...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
