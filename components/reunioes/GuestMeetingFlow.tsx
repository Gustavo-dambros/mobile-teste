"use client"

import * as React from "react"
import Image from "next/image"
import { ClockIcon, Loader2Icon, ShieldOffIcon, VideoOffIcon } from "lucide-react"

import { INVITE_POLL_INTERVAL_MS, useReunioes } from "@/lib/reunioes/store"
import type { InviteStatus } from "@/lib/reunioes/store"
import { Button } from "@/components/ui/button"
import { GuestEntryForm } from "@/components/reunioes/GuestEntryForm"
import { MeetingRoom } from "@/components/reunioes/MeetingRoom"
import { RecordingPromptDialog } from "@/components/reunioes/RecordingPromptDialog"

function CenteredMessage({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <Image src="/logo.png" alt="Unipar" width={32} height={32} className="mb-2 opacity-80" />
      {icon}
      <h1 className="text-base font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

/**
 * Public, unauthenticated flow for someone joining via the invite link:
 * name+email form -> waiting room -> (once the host admits them) the same
 * MeetingRoom the authenticated route uses. Since there's no session here,
 * every step is driven by polling GET /api/reunioes/invite/[token] with the
 * locally-held guestId as the only credential.
 */
export function GuestMeetingFlow({ inviteToken }: { inviteToken: string }) {
  const { fetchInviteStatus, getMeeting } = useReunioes()
  const [guestId, setGuestId] = React.useState<string | null>(null)
  const [invite, setInvite] = React.useState<InviteStatus | null>(null)
  const [linkInvalid, setLinkInvalid] = React.useState(false)
  const guestIdRef = React.useRef(guestId)
  // Distinguishes "never let in" from "was in the call and got removed" — the
  // latter gets a clearer message instead of the generic denial screen. Derived
  // during render (React's blessed pattern for "remember something from a past
  // render") rather than in an effect, since it only needs to react to `invite`
  // changing, not run any external side effect.
  const [wasAdmitted, setWasAdmitted] = React.useState(false)
  const [recordingPromptOpen, setRecordingPromptOpen] = React.useState(true)
  const [lastStatus, setLastStatus] = React.useState(invite?.status)
  if (invite?.status !== lastStatus) {
    setLastStatus(invite?.status)
    if (invite?.status === "admitted") setWasAdmitted(true)
  }
  React.useEffect(() => {
    guestIdRef.current = guestId
  }, [guestId])

  React.useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const result = await fetchInviteStatus(inviteToken, guestIdRef.current ?? undefined)
        if (!cancelled) setInvite(result)
      } catch {
        if (!cancelled) setLinkInvalid(true)
      }
    }
    poll()
    const interval = window.setInterval(poll, INVITE_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [inviteToken, fetchInviteStatus, guestId])

  const meeting = invite?.meetingId ? getMeeting(invite.meetingId) : undefined

  if (linkInvalid) {
    return (
      <CenteredMessage
        icon={<VideoOffIcon className="size-6 text-muted-foreground" />}
        title="Link inválido"
        description="Esta reunião não existe, ou o link expirou."
      />
    )
  }

  if (!invite) {
    return (
      <CenteredMessage
        icon={<Loader2Icon className="size-6 animate-spin text-muted-foreground" />}
        title="Carregando..."
        description="Só um instante."
      />
    )
  }

  if (invite.status === "ended") {
    return (
      <>
        <CenteredMessage
          icon={<VideoOffIcon className="size-6 text-muted-foreground" />}
          title="Reunião encerrada"
          description="O anfitrião encerrou esta reunião."
        />
        {invite.latestRecording && guestId && invite.meetingId && (
          <RecordingPromptDialog
            open={recordingPromptOpen}
            onOpenChange={setRecordingPromptOpen}
            meetingId={invite.meetingId}
            participantId={guestId}
            meetingTitle={invite.meetingTitle ?? "Reunião"}
          />
        )}
      </>
    )
  }

  if (invite.status === "admitted" && guestId && meeting) {
    return (
      <MeetingRoom
        meetingId={meeting.id}
        localParticipantId={guestId}
        onLeave={() => setGuestId(null)}
        chromeless
      />
    )
  }

  if (invite.status === "denied") {
    return wasAdmitted ? (
      <CenteredMessage
        icon={<ShieldOffIcon className="size-6 text-destructive" />}
        title="Você foi removido da reunião"
        description="O anfitrião encerrou sua participação. Você só entra de novo com um novo link, gerado pelo anfitrião."
      />
    ) : (
      <CenteredMessage
        icon={<ShieldOffIcon className="size-6 text-destructive" />}
        title="Acesso negado"
        description="O anfitrião não liberou sua entrada nesta reunião."
        action={
          <Button variant="outline" onClick={() => setGuestId(null)}>
            Pedir entrada novamente
          </Button>
        }
      />
    )
  }

  if (invite.status === "not_started") {
    return (
      <CenteredMessage
        icon={<ClockIcon className="size-6 text-muted-foreground" />}
        title="Esta reunião ainda não começou"
        description={
          invite.scheduledFor
            ? `Agendada para ${new Date(invite.scheduledFor).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}. Volte a esta página perto do horário.`
            : "Volte a esta página quando o anfitrião iniciar a reunião."
        }
      />
    )
  }

  if (invite.status === "waiting") {
    return (
      <CenteredMessage
        icon={<Loader2Icon className="size-6 animate-spin text-muted-foreground" />}
        title="Aguardando o anfitrião liberar sua entrada..."
        description="Assim que alguém liberar, você entra na reunião automaticamente."
      />
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <GuestEntryForm
        inviteToken={inviteToken}
        meetingTitle={invite.meetingTitle ?? ""}
        requiresPassword={!!invite.requiresPassword}
        onRequested={setGuestId}
      />
    </div>
  )
}
