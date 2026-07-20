"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ClockIcon } from "lucide-react"

import { useCurrentUser } from "@/lib/current-user/context"
import { MEETING_POLL_INTERVAL_MS, useReunioes } from "@/lib/reunioes/store"
import { MeetingRoom } from "@/components/reunioes/MeetingRoom"
import { RecordingPromptDialog } from "@/components/reunioes/RecordingPromptDialog"

/**
 * Thin glue for the authenticated route: joins the current session user as a
 * registered participant, then hands off to the shared MeetingRoom (the same
 * component the public guest route uses once admitted). The local
 * participant is always derived from the store, never held in local state,
 * so there's nothing to keep in sync by hand.
 */
export function AuthenticatedMeetingRoom({ meetingId }: { meetingId: string }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const { getMeeting, joinAsRegisteredUser, refreshMeeting } = useReunioes()
  const meeting = getMeeting(meetingId)
  const isHost = meeting?.hostId === currentUser?.id

  // A registered-user "join" attempt is idempotent server-side, but we still
  // only want to fire it once per distinct meeting status — otherwise every
  // poll tick (which hands us a new `meeting` object reference) would re-fire
  // it. Re-attempting is exactly what lets a non-host retry automatically
  // once the host starts an "agendada" meeting (status flips to "ativa").
  const attemptedStatusRef = React.useRef<string | null>(null)
  // Once we've been seen as a participant, losing that row again (without the
  // meeting itself ending) means the host removed us — not "haven't joined yet".
  // Distinguishing the two matters because the fallback UI for "not joined" is
  // "Entrando na reunião...", which must never be the permanent end state for
  // someone who was kicked out.
  const wasParticipantRef = React.useRef(false)
  const removedRef = React.useRef(false)
  // Retained past the point localParticipant disappears (meeting ends → getFullMeeting's
  // active-only participants list empties out) — the recording-status fetch below still
  // needs *a* participant id to identify this person as having been in the meeting.
  const lastParticipantIdRef = React.useRef<string | null>(null)
  const [recordingPromptOpen, setRecordingPromptOpen] = React.useState(true)

  React.useEffect(() => {
    refreshMeeting(meetingId)
  }, [meetingId, refreshMeeting])

  React.useEffect(() => {
    const interval = window.setInterval(() => refreshMeeting(meetingId), MEETING_POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [meetingId, refreshMeeting])

  const localParticipant = meeting?.participants.find(
    (p) => p.kind === "registered" && p.email === currentUser?.email
  )

  React.useEffect(() => {
    if (localParticipant) {
      wasParticipantRef.current = true
      lastParticipantIdRef.current = localParticipant.id
    }
  }, [localParticipant])

  React.useEffect(() => {
    if (!meeting || localParticipant || removedRef.current) return
    if (!wasParticipantRef.current) return
    if (meeting.status === "encerrada") return
    removedRef.current = true
    toast.error("Você foi removido da reunião pelo anfitrião")
    router.push("/reunioes")
  }, [meeting, localParticipant, router])

  React.useEffect(() => {
    if (!meeting || localParticipant || removedRef.current) return
    if (meeting.status === "encerrada") return
    if (meeting.status === "agendada" && !isHost) return
    if (attemptedStatusRef.current === meeting.status) return
    attemptedStatusRef.current = meeting.status
    joinAsRegisteredUser(meetingId)
  }, [meeting, localParticipant, isHost, meetingId, joinAsRegisteredUser])

  if (!meeting) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <h3 className="text-sm font-medium">Reunião não encontrada</h3>
        <p className="text-sm text-muted-foreground">
          Ela pode ter sido encerrada ou não existe mais nesta sessão.
        </p>
      </div>
    )
  }
  if (meeting.status === "encerrada") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <h3 className="text-sm font-medium">Reunião encerrada</h3>
        <p className="text-sm text-muted-foreground">Esta reunião já foi encerrada.</p>
        {meeting.latestRecording && lastParticipantIdRef.current && (
          <RecordingPromptDialog
            open={recordingPromptOpen}
            onOpenChange={setRecordingPromptOpen}
            meetingId={meetingId}
            participantId={lastParticipantIdRef.current}
            meetingTitle={meeting.title}
          />
        )}
      </div>
    )
  }
  if (meeting.status === "agendada" && !isHost) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <ClockIcon className="mb-1 size-6 text-muted-foreground" />
        <h3 className="text-sm font-medium">Aguardando o anfitrião iniciar</h3>
        <p className="text-sm text-muted-foreground">
          {meeting.scheduledFor
            ? `Esta reunião está agendada para ${new Date(meeting.scheduledFor).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}. `
            : ""}
          Você entrará automaticamente assim que {meeting.hostName} iniciar.
        </p>
      </div>
    )
  }
  if (!localParticipant) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
        Entrando na reunião...
      </div>
    )
  }

  return (
    <MeetingRoom
      meetingId={meetingId}
      localParticipantId={localParticipant.id}
      onLeave={() => router.push("/reunioes")}
      isHost={isHost}
    />
  )
}
