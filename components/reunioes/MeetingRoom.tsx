"use client"

import * as React from "react"
import { motion, useReducedMotion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  HandIcon,
  LayoutGridIcon,
  LockIcon,
  LogOutIcon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  MonitorUpIcon,
  MonitorXIcon,
  PhoneOffIcon,
  PinIcon,
  PresentationIcon,
  SmilePlusIcon,
  SquareIcon,
  UsersIcon,
  VideoIcon,
  VideoOffIcon,
  WifiOffIcon,
} from "lucide-react"
import { ConnectionQuality, Room, RoomEvent, Track, type RemoteTrack } from "livekit-client"

import { cn } from "@/lib/utils"
import { meetingControlBarIn, meetingTileIn } from "@/lib/motion"
import { participantInitials, useReunioes } from "@/lib/reunioes/store"
import { colorForParticipant } from "@/lib/reunioes/participant-color"
import type { MeetingParticipant } from "@/lib/reunioes/types"
import { playMeetingSound } from "@/lib/reunioes/meeting-sounds"
import { useMeetingSystemNote } from "@/lib/reunioes/realtime"
import { useConnectionState } from "@/lib/media/use-connection-state"
import { ChatPanel } from "@/components/reunioes/ChatPanel"
import { ParticipantsPanel } from "@/components/reunioes/ParticipantsPanel"
import { RecordingPromptDialog } from "@/components/reunioes/RecordingPromptDialog"
import { ConnectionBadge } from "@/components/media/ConnectionBadge"
import { DeviceMenu } from "@/components/media/DeviceMenu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const REACTION_EMOJIS = ["👍", "🎉", "❤️", "😂", "👏", "😮"]
const REACTION_TOPIC = "reaction"
const REACTION_LIFETIME_MS = 2200

function isPoorConnection(quality: ConnectionQuality | undefined) {
  return quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost
}

interface RemoteMedia {
  identity: string
  cameraTrack?: RemoteTrack
  audioTrack?: RemoteTrack
  screenTrack?: RemoteTrack
}

interface FloatingReaction {
  id: string
  emoji: string
}

function ControlButton({
  label,
  active,
  variant = "outline",
  disabled,
  badge,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  variant?: "outline" | "destructive"
  disabled?: boolean
  /** Small dot shown in the corner — unread chat messages while the panel is closed. */
  badge?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-lg"
            variant={variant === "destructive" ? "destructive" : active ? "default" : "outline"}
            onClick={onClick}
            disabled={disabled}
            className="relative rounded-full"
          />
        }
      >
        {children}
        {badge && (
          <span className="absolute top-1 right-1 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
        )}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Camera video if the track has arrived, avatar fallback otherwise — used in the
 * main grid, the strip alongside an active screen share/spotlight, and (bigger) as
 * the spotlighted tile itself. */
function RemoteParticipantTile({
  participant,
  media,
  index,
  variant = "grid",
  pinned,
  connectionIssue,
  onTogglePin,
}: {
  participant: MeetingParticipant
  media: RemoteMedia | undefined
  index: number
  variant?: "grid" | "strip" | "spotlight"
  pinned?: boolean
  /** True when this participant's connection quality is poor/lost — distinct from "camera off". */
  connectionIssue?: boolean
  onTogglePin?: () => void
}) {
  const reduced = useReducedMotion()
  const color = colorForParticipant(participant.id)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const cameraTrack = media?.cameraTrack
  const audioTrack = media?.audioTrack

  // Two separate effects, each keyed on its own track reference — not the whole
  // `media` object. Keying on `media` meant an audio track arriving/changing
  // would detach and re-attach the video element too (visible flicker), and
  // vice versa. Track objects are stable references from livekit-client, so
  // this only re-attaches when the actual camera/audio track changes.
  React.useEffect(() => {
    if (videoRef.current && cameraTrack) cameraTrack.attach(videoRef.current)
    return () => {
      cameraTrack?.detach()
    }
  }, [cameraTrack])

  React.useEffect(() => {
    if (audioRef.current && audioTrack) audioTrack.attach(audioRef.current)
    return () => {
      audioTrack?.detach()
    }
  }, [audioTrack])

  // Track *presence* is the source of truth for whether to show video — LiveKit
  // unpublishes the camera track entirely when it's turned off, so a subscribed,
  // unmuted track reliably means "there is a live frame to show". The DB-polled
  // `cameraOn` flag can lag behind the actual publish state and used to be the
  // sole gate, which is what caused remote video to stay blank after it arrived.
  const showVideo = !!media?.cameraTrack && !media.cameraTrack.isMuted
  const small = variant === "strip"

  return (
    <motion.div
      variants={meetingTileIn(reduced, index)}
      initial="hidden"
      animate="show"
      onClick={onTogglePin}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-muted",
        variant === "strip" && "aspect-video min-h-20",
        variant === "grid" && "aspect-video min-h-32",
        variant === "spotlight" && "min-h-0 flex-1",
        onTogglePin && "cursor-pointer"
      )}
    >
      <video ref={videoRef} autoPlay playsInline className={cn("size-full object-cover", !showVideo && "hidden")} />
      <audio ref={audioRef} autoPlay />
      {!showVideo && (
        <>
          <Avatar size={small ? "default" : "lg"} style={{ boxShadow: `0 0 0 2px ${color}` }}>
            <AvatarFallback style={{ backgroundColor: `${color}26`, color }}>
              {participantInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
          {!small && (
            <span className="max-w-[90%] truncate text-sm font-medium text-foreground">
              {participant.name}
              {participant.kind === "guest" && (
                <span className="ml-1 text-xs text-muted-foreground">(convidado)</span>
              )}
            </span>
          )}
        </>
      )}
      {showVideo && (
        <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium">
          {participant.name}
        </span>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {pinned && (
          <span className="flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground">
            <PinIcon className="size-3.5" />
          </span>
        )}
        {participant.handRaised && (
          <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/90 text-white">
            <HandIcon className="size-3.5" />
          </span>
        )}
        {connectionIssue && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/90 text-white" />
              }
            >
              <WifiOffIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Conexão instável</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="absolute right-2 bottom-2 flex items-center gap-1">
        {!participant.micOn && (
          <span className="flex size-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground">
            <MicOffIcon className="size-3.5" />
          </span>
        )}
      </div>
    </motion.div>
  )
}

export function MeetingRoom({
  meetingId,
  localParticipantId,
  onLeave,
  chromeless = false,
  isHost: isHostProp = false,
}: {
  meetingId: string
  localParticipantId: string
  onLeave: () => void
  /** True for the public guest page, which has no DashboardShell around it. */
  chromeless?: boolean
  /** Whether the current viewer is the meeting host — computed by the caller, since
   * this component is shared with the unauthenticated guest route (no session there). */
  isHost?: boolean
}) {
  const reduced = useReducedMotion()
  const {
    getMeeting,
    leaveMeeting,
    endMeeting,
    extendMeeting,
    setParticipantMic,
    setParticipantCamera,
    setParticipantScreenShare,
    setHandRaised,
    startRecording,
    stopRecording,
  } = useReunioes()
  const [recordingBusy, setRecordingBusy] = React.useState(false)

  const roomRef = React.useRef<Room | null>(null)
  const [room, setRoom] = React.useState<Room | null>(null)
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const localScreenVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const remoteScreenVideoRef = React.useRef<HTMLVideoElement | null>(null)

  const [connectError, setConnectError] = React.useState<string | null>(null)
  const [micOn, setMicOn] = React.useState(true)
  const [cameraOn, setCameraOn] = React.useState(true)
  const [screenSharing, setScreenSharing] = React.useState(false)
  const [handRaised, setLocalHandRaised] = React.useState(false)
  const [remoteMedia, setRemoteMedia] = React.useState<Map<string, RemoteMedia>>(new Map())
  const [remoteQuality, setRemoteQuality] = React.useState<Map<string, ConnectionQuality>>(new Map())
  const [layoutMode, setLayoutMode] = React.useState<"grid" | "speaker">("grid")
  const [pinnedId, setPinnedId] = React.useState<string | null>(null)
  const [activeSpeakerId, setActiveSpeakerId] = React.useState<string | null>(null)
  const [reactions, setReactions] = React.useState<FloatingReaction[]>([])

  const [panel, setPanel] = React.useState<"chat" | "participants" | null>(null)
  const [leaving, setLeaving] = React.useState(false)

  const connectionState = useConnectionState(room)

  const meeting = getMeeting(meetingId)
  const localParticipant = meeting?.participants.find((p) => p.id === localParticipantId)
  const isHost = isHostProp

  // Unread badge on the Chat button — counts messages from other people that arrived
  // since the panel was last open. Messages already in the meeting when this component
  // mounted (joining an ongoing conversation) don't retroactively count as "new".
  const othersMessageCount = React.useMemo(
    () => (meeting?.chatMessages ?? []).filter((m) => m.authorParticipantId !== localParticipantId).length,
    [meeting?.chatMessages, localParticipantId]
  )
  const [lastSeenChatCount, setLastSeenChatCount] = React.useState(othersMessageCount)
  React.useEffect(() => {
    if (panel === "chat") setLastSeenChatCount(othersMessageCount)
  }, [panel, othersMessageCount])
  const hasUnreadChat = panel !== "chat" && othersMessageCount > lastSeenChatCount

  // Warns once per deadline that the meeting is about to auto-end (see endsAt /
  // autoEndIfOverdue in lib/reunioes/server.ts) — keyed on the exact endsAt value so
  // extending the deadline (which changes it) lets the warning fire again later.
  const endWarnedForRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    const endsAt = meeting?.endsAt
    if (!endsAt) return

    function checkDeadline() {
      const msLeft = new Date(endsAt!).getTime() - Date.now()
      if (msLeft > 0 && msLeft <= 10 * 60_000 && endWarnedForRef.current !== endsAt) {
        endWarnedForRef.current = endsAt!
        toast.warning("Faltam 10 minutos para a reunião encerrar automaticamente.", {
          duration: 20_000,
          action: isHost
            ? {
                label: "+15 min",
                onClick: () => {
                  extendMeeting(meetingId, 15)
                  toast.success("15 minutos adicionados à reunião")
                },
              }
            : undefined,
        })
      }
    }

    checkDeadline()
    const interval = window.setInterval(checkDeadline, 30_000)
    return () => window.clearInterval(interval)
  }, [meeting?.endsAt, isHost, meetingId, extendMeeting])

  // Only link-invited guests are restricted by these — registered participants
  // (colleagues) always have full access, regardless of the host's guest config.
  const isLinkGuest = localParticipant?.kind === "guest"
  const chatAllowed = !isLinkGuest || meeting?.guestPermissions.chat !== false
  const screenShareAllowed = !isLinkGuest || meeting?.guestPermissions.screenShare !== false

  // Server-tracked exclusivity lock — see the `active_screen_share_participant_id`
  // column and the atomic claim/release logic in app/api/reunioes/[id]/media.
  const remoteScreenSharerId =
    meeting?.activeScreenShareParticipantId && meeting.activeScreenShareParticipantId !== localParticipantId
      ? meeting.activeScreenShareParticipantId
      : null

  React.useEffect(() => {
    if (!remoteScreenVideoRef.current || !remoteScreenSharerId) return
    const track = remoteMedia.get(remoteScreenSharerId)?.screenTrack
    if (track) track.attach(remoteScreenVideoRef.current)
  }, [remoteMedia, remoteScreenSharerId])

  // Sound cues while in the room — null on first mount so pre-existing
  // waiting guests/participants don't retroactively trigger a sound, only
  // ones that show up after we're already here.
  const previousWaitingIdsRef = React.useRef<Set<string> | null>(null)
  const previousParticipantIdsRef = React.useRef<Set<string> | null>(null)

  React.useEffect(() => {
    if (!meeting) return
    const currentIds = new Set(meeting.waitingGuests.map((g) => g.id))
    if (isHost && previousWaitingIdsRef.current) {
      const hasNewGuest = [...currentIds].some((id) => !previousWaitingIdsRef.current!.has(id))
      if (hasNewGuest) playMeetingSound("request")
    }
    previousWaitingIdsRef.current = currentIds
  }, [meeting, isHost])

  React.useEffect(() => {
    if (!meeting) return
    const currentIds = new Set(meeting.participants.map((p) => p.id))
    if (previousParticipantIdsRef.current) {
      const hasNewParticipant = [...currentIds].some(
        (id) => id !== localParticipantId && !previousParticipantIdsRef.current!.has(id)
      )
      if (hasNewParticipant) playMeetingSound("entry")
    }
    previousParticipantIdsRef.current = currentIds
  }, [meeting, localParticipantId])

  useMeetingSystemNote(
    React.useCallback(
      (note) => {
        if (note.meetingId === meetingId) toast.info(note.message)
      },
      [meetingId]
    )
  )

  function showReaction(emoji: string) {
    const id = crypto.randomUUID()
    setReactions((prev) => [...prev, { id, emoji }])
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id))
    }, REACTION_LIFETIME_MS)
  }

  function sendReaction(emoji: string) {
    showReaction(emoji)
    const room = roomRef.current
    if (!room) return
    const payload = new TextEncoder().encode(emoji)
    room.localParticipant.publishData(payload, { reliable: false, topic: REACTION_TOPIC }).catch(() => {})
  }

  // Real LiveKit connection — one Room for the lifetime of this component,
  // publishing mic/camera/screen-share and subscribing to everyone else's.
  React.useEffect(() => {
    let cancelled = false
    const room = new Room()
    roomRef.current = room
    setRoom(room)

    function attachLocalVideo() {
      const pub = [...room.localParticipant.videoTrackPublications.values()].find(
        (p) => p.source === Track.Source.Camera
      )
      if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current)
    }

    /** Rebuilds remoteMedia from the room's actual current subscriptions — used after a
     * reconnect and when a participant is already-connected-with-tracks by the time we
     * observe them, since track events can arrive out of the order this Map expects. */
    function syncRemoteMediaFromRoom() {
      setRemoteMedia((prev) => {
        const next = new Map(prev)
        for (const participant of room.remoteParticipants.values()) {
          const existing = next.get(participant.identity) ?? { identity: participant.identity }
          const updated = { ...existing }
          for (const pub of participant.trackPublications.values()) {
            if (!pub.isSubscribed || !pub.track) continue
            if (pub.source === Track.Source.ScreenShare) updated.screenTrack = pub.track
            else if (pub.track.kind === Track.Kind.Video) updated.cameraTrack = pub.track
            else if (pub.track.kind === Track.Kind.Audio) updated.audioTrack = pub.track
          }
          next.set(participant.identity, updated)
        }
        return next
      })
    }

    room
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        setRemoteMedia((prev) => {
          const next = new Map(prev)
          // Copy rather than mutate the existing entry in place — the old in-place
          // mutation left `media` referentially unchanged across renders, so the
          // RemoteParticipantTile's `[media]` effect (which attaches the track to
          // the <video>/<audio> element) never re-ran when a track arrived after
          // the participant's placeholder entry already existed. That's what made
          // the camera tile stay blank for anyone joining after their entry was
          // first seeded by ParticipantConnected.
          const existing = next.get(participant.identity) ?? { identity: participant.identity }
          const updated = { ...existing }
          if (publication.source === Track.Source.ScreenShare) updated.screenTrack = track
          else if (track.kind === Track.Kind.Video) updated.cameraTrack = track
          else if (track.kind === Track.Kind.Audio) updated.audioTrack = track
          next.set(participant.identity, updated)
          return next
        })
      })
      .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        track.detach()
        setRemoteMedia((prev) => {
          const existing = prev.get(participant.identity)
          if (!existing) return prev
          const next = new Map(prev)
          const updated = { ...existing }
          if (publication.source === Track.Source.ScreenShare) updated.screenTrack = undefined
          else if (track.kind === Track.Kind.Video) updated.cameraTrack = undefined
          else if (track.kind === Track.Kind.Audio) updated.audioTrack = undefined
          next.set(participant.identity, updated)
          return next
        })
      })
      .on(RoomEvent.ParticipantConnected, () => {
        // Reconcile immediately instead of waiting for the first TrackSubscribed —
        // covers the case where tracks were already subscribed by the time we
        // learn about the participant (fast rejoin, reconnect race).
        syncRemoteMediaFromRoom()
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        setRemoteMedia((prev) => {
          const existing = prev.get(participant.identity)
          if (!existing) return prev
          existing.cameraTrack?.detach()
          existing.audioTrack?.detach()
          existing.screenTrack?.detach()
          const next = new Map(prev)
          next.delete(participant.identity)
          return next
        })
        setRemoteQuality((prev) => {
          if (!prev.has(participant.identity)) return prev
          const next = new Map(prev)
          next.delete(participant.identity)
          return next
        })
      })
      .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant.isLocal) return
        setRemoteQuality((prev) => {
          const next = new Map(prev)
          next.set(participant.identity, quality)
          return next
        })
      })
      .on(RoomEvent.Reconnected, () => {
        // Tracks can be silently re-subscribed on reconnect without necessarily
        // re-firing TrackSubscribed in the order our Map expects — force a resync.
        syncRemoteMediaFromRoom()
        attachLocalVideo()
      })
      // The browser's own "Stop sharing" bar bypasses our button entirely.
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) {
          setScreenSharing(false)
          setParticipantScreenShare(meetingId, localParticipantId, false)
        }
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setActiveSpeakerId(speakers[0]?.identity ?? null)
      })
      .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        if (topic !== REACTION_TOPIC || !participant) return
        showReaction(new TextDecoder().decode(payload))
      })

    async function join() {
      try {
        const res = await fetch("/api/reunioes/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId, participantId: localParticipantId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Não foi possível entrar na reunião")
        if (cancelled) return

        await room.connect(data.url, data.token)
        if (cancelled) {
          room.disconnect()
          return
        }

        await room.localParticipant.setMicrophoneEnabled(true)
        await room.localParticipant.setCameraEnabled(true)
        setMicOn(true)
        setCameraOn(true)
        attachLocalVideo()
      } catch (error) {
        console.error("[reunioes] failed to join LiveKit room", error)
        if (!cancelled) {
          setConnectError(error instanceof Error ? error.message : "Não foi possível conectar à reunião")
        }
      }
    }

    join()

    return () => {
      cancelled = true
      room.disconnect()
      roomRef.current = null
      setRoom(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, localParticipantId])

  // The host can force our mic off (see ParticipantsPanel) — the server row
  // flips first, and we notice it here and actually stop publishing.
  React.useEffect(() => {
    if (!localParticipant || !roomRef.current) return
    if (!localParticipant.micOn && micOn) {
      roomRef.current.localParticipant.setMicrophoneEnabled(false).catch(() => {})
      setMicOn(false)
    }
  }, [localParticipant, micOn])

  // Same as the mic effect above, for a host-forced camera-off.
  React.useEffect(() => {
    if (!localParticipant || !roomRef.current) return
    if (!localParticipant.cameraOn && cameraOn) {
      roomRef.current.localParticipant.setCameraEnabled(false).catch(() => {})
      setCameraOn(false)
    }
  }, [localParticipant, cameraOn])

  async function toggleMic() {
    const room = roomRef.current
    if (!room) return
    const next = !micOn
    // Turning it back on ourselves is exactly what a host mute/mute-all is meant to
    // prevent — the server enforces this too (see /media), but checking here avoids
    // a pointless publish-then-get-forced-off-again round trip.
    if (next && localParticipant?.micLocked) {
      toast.error("O anfitrião silenciou seu microfone. Peça para liberar antes de ativar de novo.")
      return
    }
    await room.localParticipant.setMicrophoneEnabled(next)
    setMicOn(next)
    setParticipantMic(meetingId, localParticipantId, next)
  }

  async function toggleCamera() {
    const room = roomRef.current
    if (!room) return
    const next = !cameraOn
    if (next && localParticipant?.cameraLocked) {
      toast.error("O anfitrião desligou sua câmera. Peça para liberar antes de ligar de novo.")
      return
    }
    await room.localParticipant.setCameraEnabled(next)
    setCameraOn(next)
    setParticipantCamera(meetingId, localParticipantId, next)
    if (next) {
      requestAnimationFrame(() => {
        const pub = [...room.localParticipant.videoTrackPublications.values()].find(
          (p) => p.source === Track.Source.Camera
        )
        if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current)
      })
    }
  }

  async function toggleScreenShare() {
    const room = roomRef.current
    if (!room) return
    if (!screenShareAllowed) {
      toast.error("O anfitrião desativou o compartilhamento de tela para convidados pelo link.")
      return
    }

    if (!screenSharing) {
      // Claim the server-side exclusivity lock *before* publishing, so a 409
      // (someone else already sharing) never leaves a local publish dangling.
      const claim = await setParticipantScreenShare(meetingId, localParticipantId, true)
      if (!claim.ok) {
        toast.error(claim.error ?? "Não foi possível compartilhar a tela.")
        return
      }
      try {
        await room.localParticipant.setScreenShareEnabled(true)
        setScreenSharing(true)
        requestAnimationFrame(() => {
          const pub = [...room.localParticipant.videoTrackPublications.values()].find(
            (p) => p.source === Track.Source.ScreenShare
          )
          if (pub?.track && localScreenVideoRef.current) pub.track.attach(localScreenVideoRef.current)
        })
      } catch {
        // User cancelled the browser's screen picker — release the lock we just claimed.
        setParticipantScreenShare(meetingId, localParticipantId, false)
      }
    } else {
      try {
        await room.localParticipant.setScreenShareEnabled(false)
      } catch {
        // Already stopped (e.g. via the browser's native "Stop sharing" bar).
      }
      setScreenSharing(false)
      setParticipantScreenShare(meetingId, localParticipantId, false)
    }
  }

  function toggleHandRaised() {
    const next = !handRaised
    setLocalHandRaised(next)
    setHandRaised(meetingId, localParticipantId, next)
  }

  async function toggleRecording() {
    if (recordingBusy || !meeting) return
    setRecordingBusy(true)
    const result = meeting.isRecording ? await stopRecording(meetingId) : await startRecording(meetingId)
    setRecordingBusy(false)
    if (!result.ok) toast.error(result.error ?? "Não foi possível alterar a gravação")
  }

  function togglePin(id: string) {
    setPinnedId((prev) => (prev === id ? null : id))
  }

  function handleLeave() {
    roomRef.current?.disconnect()
    leaveMeeting(meetingId, localParticipantId)
    // Recorded meetings get one more screen (the download prompt) before actually
    // navigating away — see the `leaving` early-return below.
    if (meeting?.latestRecording) setLeaving(true)
    else onLeave()
  }

  function handleEndForEveryone() {
    roomRef.current?.disconnect()
    endMeeting(meetingId)
    if (meeting?.latestRecording) setLeaving(true)
    else onLeave()
  }

  const pendingGuestCount = meeting?.waitingGuests.length ?? 0

  if (!meeting) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <h3 className="text-sm font-medium">Reunião não encontrada</h3>
        <p className="text-sm text-muted-foreground">
          Ela pode ter sido encerrada, ou ainda não sincronizou nesta aba.
        </p>
      </div>
    )
  }

  if (leaving) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Saindo da reunião...</p>
        <RecordingPromptDialog
          open
          onOpenChange={(open) => {
            if (!open) onLeave()
          }}
          meetingId={meetingId}
          participantId={localParticipantId}
          meetingTitle={meeting.title}
        />
      </div>
    )
  }

  const remoteParticipants = meeting.participants.filter((p) => p.id !== localParticipantId)
  // Who's sharing is decided by the server-tracked lock (meeting.activeScreenShareParticipantId),
  // never by "whichever remote track we happen to iterate to first" — that ambiguity was the
  // root cause of screen share looking like only one person could ever share.
  const remoteScreenSharer = remoteScreenSharerId
    ? remoteParticipants.find((p) => p.id === remoteScreenSharerId)
    : undefined
  const activeScreenShare =
    meeting.activeScreenShareParticipantId === localParticipantId ? "local" : remoteScreenSharer ? "remote" : null
  const someoneElseSharing = !!meeting.activeScreenShareParticipantId && !screenSharing

  const spotlightPool = new Set([localParticipantId, ...remoteParticipants.map((p) => p.id)])
  const spotlightCameraId = activeScreenShare
    ? null
    : pinnedId && spotlightPool.has(pinnedId)
      ? pinnedId
      : layoutMode === "speaker" && activeSpeakerId && spotlightPool.has(activeSpeakerId)
        ? activeSpeakerId
        : null
  const showStrip = !!activeScreenShare || !!spotlightCameraId
  const spotlightedRemote = spotlightCameraId
    ? remoteParticipants.find((p) => p.id === spotlightCameraId)
    : undefined
  const localIsSpotlighted = spotlightCameraId === localParticipantId

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col gap-4 bg-background p-4",
        // Guests have no ancestor providing a bounded height (the authenticated route
        // gets that from SidebarProvider, via flex-1 up a *bounded* flex chain). body
        // itself has no definite height (only min-h-full), so flex-1 here (which sets
        // flex-basis:0%) made the browser size this div off its *content* instead of
        // the dvh value — h-dvh was being silently ignored. Confirmed with a real
        // Playwright repro (webkit + chromium, several viewport sizes): dropping
        // flex-1 for this branch and sizing purely off h-dvh (resolves against the
        // real viewport, independent of any ancestor) is what actually fixes the
        // "layout fica maior e com scrollagem" bug for the link-guest route.
        chromeless ? "h-dvh overflow-hidden" : "flex-1"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-wrap justify-center gap-2 px-4">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.span
              key={r.id}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 1, y: -40, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: REACTION_LIFETIME_MS / 1000, ease: "easeOut" }}
              className="text-3xl"
            >
              {r.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h2 className="flex items-center gap-1.5 truncate text-base font-semibold">
            {meeting.title}
            {meeting.locked && (
              <Tooltip>
                <TooltipTrigger render={<span className="text-muted-foreground" />}>
                  <LockIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Reunião bloqueada para novas entradas</TooltipContent>
              </Tooltip>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            {meeting.participants.length}{" "}
            {meeting.participants.length === 1 ? "participante" : "participantes"}
            {connectError && <span className="text-destructive"> · {connectError}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {meeting.isRecording && (
            <Badge variant="destructive" className="gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              Gravando
            </Badge>
          )}
          <ConnectionBadge state={connectionState} />
          {meeting.status === "encerrada" && <Badge variant="destructive">Encerrada</Badge>}
        </div>
      </div>

      <div className={cn("flex min-h-0 flex-1 gap-3", showStrip ? "flex-col lg:flex-row" : "")}>
        {activeScreenShare && (
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">
            <video
              ref={activeScreenShare === "local" ? localScreenVideoRef : remoteScreenVideoRef}
              autoPlay
              muted={activeScreenShare === "local"}
              playsInline
              className="size-full object-contain"
            />
            <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium">
              {activeScreenShare === "local" ? "Sua tela" : `Tela de ${remoteScreenSharer?.name}`}
            </span>
          </div>
        )}

        {!activeScreenShare && spotlightCameraId && (
          <>
            {localIsSpotlighted ? (
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn("size-full object-cover", !cameraOn && "hidden")}
                />
                {!cameraOn && localParticipant && (
                  <Avatar size="lg" style={{ boxShadow: `0 0 0 2px ${colorForParticipant(localParticipant.id)}` }}>
                    <AvatarFallback
                      style={{
                        backgroundColor: `${colorForParticipant(localParticipant.id)}26`,
                        color: colorForParticipant(localParticipant.id),
                      }}
                    >
                      {participantInitials(localParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium">
                  Você
                </span>
                {handRaised && (
                  <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-amber-500/90 text-white">
                    <HandIcon className="size-3.5" />
                  </span>
                )}
              </div>
            ) : spotlightedRemote ? (
              <RemoteParticipantTile
                participant={spotlightedRemote}
                media={remoteMedia.get(spotlightedRemote.id)}
                index={0}
                variant="spotlight"
                connectionIssue={isPoorConnection(remoteQuality.get(spotlightedRemote.id))}
              />
            ) : null}
          </>
        )}

        <div
          className={cn(
            "grid min-h-0 auto-rows-fr gap-3",
            // min-h-0 here is load-bearing: a grid with several min-h-20 rows has a
            // content-driven minimum height that otherwise wins over the flex row's
            // available space (confirmed with Playwright — without this, the strip
            // forced the whole page taller than the viewport at any wide/short window,
            // laptop included, regardless of the overflow-y-auto below).
            showStrip
              ? // Scrolls internally when there are more tiles than fit — at every
                // breakpoint, not just lg: — so a crowded call never grows the page
                // itself, only this strip.
                "max-h-[45vh] grid-cols-3 overflow-y-auto sm:grid-cols-4 lg:max-h-none lg:w-56 lg:shrink-0 lg:grid-cols-1"
              : "min-w-0 flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {(activeScreenShare || !localIsSpotlighted) && (
            <motion.div
              variants={meetingTileIn(reduced, 0)}
              initial="hidden"
              animate="show"
              onClick={spotlightCameraId === null ? undefined : () => togglePin(localParticipantId)}
              className={cn(
                "relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted",
                showStrip ? "min-h-20" : "min-h-32",
                showStrip && "cursor-pointer"
              )}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn("size-full object-cover", !cameraOn && "hidden")}
              />
              {!cameraOn && localParticipant && (
                <Avatar
                  size={showStrip ? "default" : "lg"}
                  style={{ boxShadow: `0 0 0 2px ${colorForParticipant(localParticipant.id)}` }}
                >
                  <AvatarFallback
                    style={{
                      backgroundColor: `${colorForParticipant(localParticipant.id)}26`,
                      color: colorForParticipant(localParticipant.id),
                    }}
                  >
                    {participantInitials(localParticipant.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              {!showStrip && (
                <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium">
                  Você
                </span>
              )}
              {handRaised && (
                <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-amber-500/90 text-white">
                  <HandIcon className="size-3.5" />
                </span>
              )}
              {!micOn && (
                <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground">
                  <MicOffIcon className="size-3.5" />
                </span>
              )}
            </motion.div>
          )}

          {remoteParticipants
            .filter((p) => activeScreenShare || p.id !== spotlightCameraId)
            .map((p, index) => (
              <RemoteParticipantTile
                key={p.id}
                participant={p}
                media={remoteMedia.get(p.id)}
                index={index + 1}
                variant={showStrip ? "strip" : "grid"}
                pinned={pinnedId === p.id}
                connectionIssue={isPoorConnection(remoteQuality.get(p.id))}
                onTogglePin={activeScreenShare ? undefined : () => togglePin(p.id)}
              />
            ))}
        </div>
      </div>

      <motion.div
        variants={meetingControlBarIn(reduced)}
        initial="hidden"
        animate="show"
        className="flex flex-wrap items-center justify-center gap-2 rounded-full border bg-card p-2 shadow-sm"
      >
        <ControlButton
          label={
            micOn
              ? "Mutar microfone"
              : localParticipant?.micLocked
                ? "Silenciado pelo anfitrião"
                : "Ativar microfone"
          }
          active={micOn}
          onClick={toggleMic}
        >
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </ControlButton>
        <ControlButton
          label={
            cameraOn
              ? "Desligar câmera"
              : localParticipant?.cameraLocked
                ? "Desligada pelo anfitrião"
                : "Ligar câmera"
          }
          active={cameraOn}
          onClick={toggleCamera}
        >
          {cameraOn ? <VideoIcon /> : <VideoOffIcon />}
        </ControlButton>
        <ControlButton
          label={
            screenSharing
              ? "Parar compartilhamento"
              : !screenShareAllowed
                ? "O anfitrião desativou o compartilhamento de tela para convidados pelo link"
                : someoneElseSharing
                  ? `${remoteScreenSharer?.name ?? "Outra pessoa"} já está compartilhando a tela`
                  : "Compartilhar tela"
          }
          active={screenSharing}
          disabled={someoneElseSharing || !screenShareAllowed}
          onClick={toggleScreenShare}
        >
          {screenSharing ? <MonitorXIcon /> : <MonitorUpIcon />}
        </ControlButton>
        <ControlButton
          label={handRaised ? "Abaixar a mão" : "Levantar a mão"}
          active={handRaised}
          onClick={toggleHandRaised}
        >
          <HandIcon />
        </ControlButton>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-lg"
                variant="outline"
                className="rounded-full"
                onClick={() => setLayoutMode((m) => (m === "grid" ? "speaker" : "grid"))}
              />
            }
          >
            {layoutMode === "grid" ? <LayoutGridIcon /> : <PresentationIcon />}
            <span className="sr-only">Alternar layout</span>
          </TooltipTrigger>
          <TooltipContent>{layoutMode === "grid" ? "Grade" : "Destaque em quem fala"}</TooltipContent>
        </Tooltip>

        <Popover>
          <PopoverTrigger render={<Button type="button" size="icon-lg" variant="outline" className="rounded-full" />}>
            <SmilePlusIcon />
            <span className="sr-only">Reações</span>
          </PopoverTrigger>
          <PopoverContent className="flex w-auto gap-1 p-1.5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="rounded-md p-1 text-lg hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <DeviceMenu room={room} />

        <ControlButton
          label="Chat"
          active={panel === "chat"}
          badge={hasUnreadChat}
          onClick={() => setPanel((p) => (p === "chat" ? null : "chat"))}
        >
          <MessageSquareIcon />
        </ControlButton>
        <div className="relative">
          <ControlButton
            label="Participantes"
            active={panel === "participants"}
            onClick={() => setPanel((p) => (p === "participants" ? null : "participants"))}
          >
            <UsersIcon />
          </ControlButton>
          {isHost && pendingGuestCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-4 rounded-full px-1 tabular-nums"
            >
              {pendingGuestCount}
            </Badge>
          )}
        </div>
        {isHost && (
          <ControlButton
            label={meeting.isRecording ? "Parar gravação" : "Gravar reunião"}
            active={meeting.isRecording}
            variant={meeting.isRecording ? "destructive" : "outline"}
            disabled={recordingBusy}
            onClick={toggleRecording}
          >
            {meeting.isRecording ? <SquareIcon className="fill-current" /> : <SquareIcon />}
          </ControlButton>
        )}
        {!isHost && (
          <ControlButton label="Sair da reunião" variant="destructive" onClick={handleLeave}>
            <LogOutIcon />
          </ControlButton>
        )}
        {isHost && (
          <ControlButton label="Encerrar para todos" variant="destructive" onClick={handleEndForEveryone}>
            <PhoneOffIcon />
          </ControlButton>
        )}
      </motion.div>

      <ChatPanel
        meetingId={meetingId}
        localParticipantId={localParticipantId}
        connectionState={connectionState}
        canSend={chatAllowed}
        open={panel === "chat"}
        onOpenChange={(open) => setPanel(open ? "chat" : null)}
      />
      <ParticipantsPanel
        meetingId={meetingId}
        isHost={!!isHost}
        localParticipantId={localParticipantId}
        open={panel === "participants"}
        onOpenChange={(open) => setPanel(open ? "participants" : null)}
      />
    </div>
  )
}
