"use client"

import * as React from "react"
import { toast } from "sonner"

/**
 * Real voice-message recording via MediaRecorder — nothing like this exists
 * elsewhere in the repo yet. Mirrors lib/reunioes/local-media.ts's approach
 * to permissions/cleanup, but records instead of just streaming.
 */
export function useAudioRecorder() {
  const [recording, setRecording] = React.useState(false)
  const [durationSeconds, setDurationSeconds] = React.useState(0)

  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const streamRef = React.useRef<MediaStream | null>(null)
  const startTimeRef = React.useRef(0)
  const intervalRef = React.useRef<number | null>(null)

  function cleanup() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    setRecording(false)
  }

  const start = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start()
      recorderRef.current = recorder
      startTimeRef.current = Date.now()
      setDurationSeconds(0)
      setRecording(true)
      intervalRef.current = window.setInterval(() => {
        setDurationSeconds((Date.now() - startTimeRef.current) / 1000)
      }, 200)
    } catch {
      toast.error("Não foi possível acessar o microfone.")
    }
  }, [])

  const stop = React.useCallback((): Promise<{ blob: Blob; durationSeconds: number } | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }
      const finalDuration = (Date.now() - startTimeRef.current) / 1000
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        cleanup()
        resolve({ blob, durationSeconds: finalDuration })
      }
      recorder.stop()
    })
  }, [])

  const cancel = React.useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null
      recorder.stop()
    }
    cleanup()
  }, [])

  React.useEffect(() => () => cancel(), [cancel])

  return { recording, durationSeconds, start, stop, cancel }
}
