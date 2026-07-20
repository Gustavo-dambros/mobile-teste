"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  Maximize2Icon,
  MicIcon,
  MicOffIcon,
  Minimize2Icon,
  MonitorUpIcon,
  MonitorXIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "lucide-react"
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client"

import { cn, hashColor } from "@/lib/utils"
import { meetingControlBarIn, meetingTileIn } from "@/lib/motion"
import { CallSoundPlayer } from "@/lib/chat-interno/call-sounds"
import { useChatInterno } from "@/lib/chat-interno/store"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import type { Call, Conversation } from "@/lib/chat-interno/types"
import { useConnectionState } from "@/lib/media/use-connection-state"
import { ConnectionBadge } from "@/components/media/ConnectionBadge"
import { DeviceMenu } from "@/components/media/DeviceMenu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const REMOTE_STATUS_POLL_MS = 3_000

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function DurationLabel({ startedAt }: { startedAt: string }) {
  const [seconds, setSeconds] = React.useState(0)
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [startedAt])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return <span>{`${m}:${String(s).padStart(2, "0")}`}</span>
}

interface RemoteTile {
  identity: string
  name: string
  videoTrack?: RemoteTrack
  audioTrack?: RemoteTrack
  screenTrack?: RemoteTrack
}

/**
 * Real LiveKit-backed call room. Voice and video calls are deliberately
 * different experiences, not the same screen with a toggle: a voice call
 * (call.kind === "audio") never requests the camera and never shows a video
 * tile or a camera button at all — only mic + hang up. A video call
 * (call.kind === "video") starts the camera automatically and shows the
 * full tile grid with a camera toggle. Screen share is a video-call-only
 * feature for the same reason.
 */
export function ChatCallRoom({
  call,
  conversation,
  minimized,
  onToggleMinimize,
  onEnd,
}: {
  call: Call
  conversation: Conversation
  /** Floating top-right pill instead of the full overlay — the LiveKit Room
   * connection (below) is keyed only by call.id/isVideoCall, so toggling
   * this never reconnects the call, it just changes what's visible. */
  minimized: boolean
  onToggleMinimize: () => void
  onEnd: () => void
}) {
  const reduced = useReducedMotion()
  const isVideoCall = call.kind === "video"
  const roster = useChatRoster()
  const rosterById = React.useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster])
  const { refreshCall } = useChatInterno()

  const roomRef = React.useRef<Room | null>(null)
  const [room, setRoom] = React.useState<Room | null>(null)
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const localScreenVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const remoteVideoRefs = React.useRef<Map<string, HTMLVideoElement>>(new Map())
  const remoteAudioRefs = React.useRef<Map<string, HTMLAudioElement>>(new Map())
  const remoteScreenVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const [sound] = React.useState(() => new CallSoundPlayer())
  const endedRef = React.useRef(false)

  const [connected, setConnected] = React.useState(false)
  const [connectError, setConnectError] = React.useState<string | null>(null)
  const [micOn, setMicOn] = React.useState(true)
  const [cameraOn, setCameraOn] = React.useState(isVideoCall)
  const [screenSharing, setScreenSharing] = React.useState(false)
  const [remoteTiles, setRemoteTiles] = React.useState<Map<string, RemoteTile>>(new Map())

  const connectionState = useConnectionState(room)

  // The other side hanging up only reaches us via broadcast or this poll —
  // without it, a broadcast failure would leave us stuck in the call room
  // forever with no hangup sound and no way out but a manual click.
  React.useEffect(() => {
    const interval = window.setInterval(() => refreshCall(call.id), REMOTE_STATUS_POLL_MS)
    return () => window.clearInterval(interval)
  }, [call.id, refreshCall])

  // Fires whether the remote side ended it (status flips via poll/broadcast)
  // or we ourselves clicked hang up (handleEnd ends the call first, which
  // updates this same `call` prop through the parent).
  React.useEffect(() => {
    if (call.status === "active" || endedRef.current) return
    endedRef.current = true
    sound.play("hangup")
    roomRef.current?.disconnect()
    onEnd()
  }, [call.status, onEnd, sound])

  React.useEffect(() => {
    let cancelled = false
    const room = new Room()
    roomRef.current = room
    setRoom(room)

    room
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        // A voice call never renders video, even if a peer's client somehow
        // published a video track — ignore it entirely to keep the two call
        // types genuinely distinct instead of just hidden-by-CSS.
        if (!isVideoCall && track.kind === Track.Kind.Video) return
        setRemoteTiles((prev) => {
          const next = new Map(prev)
          const existing = next.get(participant.identity) ?? {
            identity: participant.identity,
            name: participant.name || "Colega",
          }
          if (publication.source === Track.Source.ScreenShare) existing.screenTrack = track
          else if (track.kind === Track.Kind.Video) existing.videoTrack = track
          else if (track.kind === Track.Kind.Audio) existing.audioTrack = track
          next.set(participant.identity, existing)
          return next
        })
      })
      .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        setRemoteTiles((prev) => {
          const existing = prev.get(participant.identity)
          if (!existing) return prev
          const next = new Map(prev)
          const updated = { ...existing }
          if (publication.source === Track.Source.ScreenShare) updated.screenTrack = undefined
          else if (track.kind === Track.Kind.Video) updated.videoTrack = undefined
          else if (track.kind === Track.Kind.Audio) updated.audioTrack = undefined
          next.set(participant.identity, updated)
          return next
        })
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        setRemoteTiles((prev) => {
          if (!prev.has(participant.identity)) return prev
          const next = new Map(prev)
          next.delete(participant.identity)
          return next
        })
      })
      // The browser's own "Stop sharing" bar bypasses our button entirely.
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) setScreenSharing(false)
      })

    async function join() {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId: call.id }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Não foi possível entrar na chamada")
        if (cancelled) return

        await room.connect(data.url, data.token)
        if (cancelled) {
          room.disconnect()
          return
        }
        setConnected(true)

        await room.localParticipant.setMicrophoneEnabled(true)
        // Voice calls never touch the camera — no permission prompt, no
        // publish, nothing to toggle. Only video calls do.
        if (isVideoCall) {
          await room.localParticipant.setCameraEnabled(true)
          attachLocalVideo(room)
        }
      } catch (error) {
        console.error("[chat-call] failed to join LiveKit room", error)
        if (!cancelled) {
          setConnectError(error instanceof Error ? error.message : "Não foi possível conectar à chamada")
        }
      }
    }

    function attachLocalVideo(room: Room) {
      const pub = [...room.localParticipant.videoTrackPublications.values()].find(
        (p) => p.source === Track.Source.Camera
      )
      if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current)
    }

    join()

    return () => {
      cancelled = true
      room.disconnect()
      roomRef.current = null
      setRoom(null)
    }
  }, [call.id, isVideoCall])

  React.useEffect(() => {
    return () => sound.stop()
  }, [sound])

  // Keep remote <video>/<audio> elements attached as tiles are added/updated.
  React.useEffect(() => {
    for (const [identity, tile] of remoteTiles) {
      const videoEl = remoteVideoRefs.current.get(identity)
      if (videoEl && tile.videoTrack) tile.videoTrack.attach(videoEl)
      const audioEl = remoteAudioRefs.current.get(identity)
      if (audioEl && tile.audioTrack) tile.audioTrack.attach(audioEl)
      if (remoteScreenVideoRef.current && tile.screenTrack) tile.screenTrack.attach(remoteScreenVideoRef.current)
    }
  }, [remoteTiles])

  async function toggleMic() {
    const room = roomRef.current
    if (!room) return
    const next = !micOn
    await room.localParticipant.setMicrophoneEnabled(next)
    setMicOn(next)
  }

  async function toggleCamera() {
    if (!isVideoCall) return
    const room = roomRef.current
    if (!room) return
    const next = !cameraOn
    await room.localParticipant.setCameraEnabled(next)
    setCameraOn(next)
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
    if (!isVideoCall) return
    const room = roomRef.current
    if (!room) return
    const next = !screenSharing
    try {
      await room.localParticipant.setScreenShareEnabled(next)
      setScreenSharing(next)
      if (next) {
        requestAnimationFrame(() => {
          const pub = [...room.localParticipant.videoTrackPublications.values()].find(
            (p) => p.source === Track.Source.ScreenShare
          )
          if (pub?.track && localScreenVideoRef.current) pub.track.attach(localScreenVideoRef.current)
        })
      }
    } catch {
      // User cancelled the browser's screen picker — nothing to report.
    }
  }

  function handleEnd() {
    // I'm the one hanging up — play the sound and disconnect right away
    // rather than waiting for the status-watching effect above, since the
    // parent unmounts this component as soon as onEnd() runs (before the
    // async endCall() call even resolves).
    endedRef.current = true
    sound.play("hangup")
    roomRef.current?.disconnect()
    onEnd()
  }

  const title =
    conversation.kind === "group"
      ? (conversation.name ?? "Grupo")
      : (rosterById.get(conversation.memberIds[0])?.name ?? "Contato")

  const statusLabel = call.answeredAt ? (
    <DurationLabel startedAt={call.answeredAt} />
  ) : connectError ? (
    connectError
  ) : connected ? (
    "conectado"
  ) : (
    "conectando..."
  )

  const remoteList = [...remoteTiles.values()]
  const color = hashColor(call.id)
  const remoteScreenSharer = remoteList.find((t) => t.screenTrack)
  const activeScreenShare = screenSharing ? "local" : remoteScreenSharer ? "remote" : null

  return (
    <>
      {minimized && (
        <div className="fixed top-4 right-4 z-50 flex w-72 items-center gap-2 rounded-2xl border bg-card p-2.5 shadow-lg">
          <button
            type="button"
            onClick={onToggleMinimize}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left hover:bg-muted"
          >
            <Avatar style={{ boxShadow: `0 0 0 2px ${color}` }}>
              <AvatarFallback style={{ backgroundColor: `${color}26`, color }}>{initials(title)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{title}</span>
              <span className="text-xs text-muted-foreground">{statusLabel}</span>
            </span>
            <Maximize2Icon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant={micOn ? "default" : "outline"}
              className="rounded-full"
              onClick={toggleMic}
            >
              {micOn ? <MicIcon /> : <MicOffIcon />}
              <span className="sr-only">{micOn ? "Mutar microfone" : "Ativar microfone"}</span>
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              className="rounded-full"
              onClick={handleEnd}
            >
              <PhoneOffIcon />
              <span className="sr-only">Encerrar chamada</span>
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex-col gap-4 bg-background p-4",
          minimized ? "hidden" : "fixed inset-0 z-40 flex"
        )}
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex w-full items-center justify-between">
            <ConnectionBadge state={connectionState} />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-full"
              onClick={onToggleMinimize}
            >
              <Minimize2Icon />
              <span className="sr-only">Minimizar chamada</span>
            </Button>
          </div>
          <span className="text-base font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">
            {isVideoCall ? "Chamada de vídeo" : "Chamada de voz"} · {statusLabel}
          </span>
        </div>

      {isVideoCall ? (
        <div className={cn("flex flex-1 gap-3", activeScreenShare ? "flex-col lg:flex-row" : "")}>
          {activeScreenShare && (
            <div className="relative flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">
              <video
                ref={activeScreenShare === "local" ? localScreenVideoRef : remoteScreenVideoRef}
                autoPlay
                muted={activeScreenShare === "local"}
                playsInline
                className="max-h-full max-w-full"
              />
              <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium">
                {activeScreenShare === "local"
                  ? "Sua tela"
                  : `Tela de ${rosterById.get(remoteScreenSharer!.identity)?.name ?? remoteScreenSharer!.name}`}
              </span>
            </div>
          )}

          <div
            className={cn(
              "grid auto-rows-fr gap-3",
              activeScreenShare
                ? "grid-cols-3 sm:grid-cols-4 lg:w-56 lg:shrink-0 lg:grid-cols-1 lg:overflow-y-auto"
                : "flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}
          >
            <motion.div
              variants={meetingTileIn(reduced, 0)}
              initial="hidden"
              animate="show"
              className={cn(
                "relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted",
                activeScreenShare ? "min-h-20" : "min-h-32"
              )}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn("size-full object-cover", !cameraOn && "hidden")}
              />
              {!cameraOn && (
                <Avatar size="lg">
                  <AvatarFallback>Eu</AvatarFallback>
                </Avatar>
              )}
              {!activeScreenShare && (
                <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium">
                  Você
                </span>
              )}
              {!micOn && (
                <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground">
                  <MicOffIcon className="size-3.5" />
                </span>
              )}
            </motion.div>

            {remoteList.map((tile, index) => {
              const member = rosterById.get(tile.identity)
              const name = member?.name ?? tile.name
              const color = hashColor(tile.identity)
              return (
                <motion.div
                  key={tile.identity}
                  variants={meetingTileIn(reduced, index + 1)}
                  initial="hidden"
                  animate="show"
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-muted",
                    activeScreenShare ? "aspect-video min-h-20" : "aspect-video min-h-32"
                  )}
                >
                  <video
                    ref={(el) => {
                      if (el) remoteVideoRefs.current.set(tile.identity, el)
                      else remoteVideoRefs.current.delete(tile.identity)
                      if (el && tile.videoTrack) tile.videoTrack.attach(el)
                    }}
                    autoPlay
                    playsInline
                    className={cn("size-full object-cover", !tile.videoTrack && "hidden")}
                  />
                  <audio
                    ref={(el) => {
                      if (el) remoteAudioRefs.current.set(tile.identity, el)
                      else remoteAudioRefs.current.delete(tile.identity)
                      if (el && tile.audioTrack) tile.audioTrack.attach(el)
                    }}
                    autoPlay
                  />
                  {!tile.videoTrack && (
                    <>
                      <Avatar size={activeScreenShare ? "default" : "lg"} style={{ boxShadow: `0 0 0 2px ${color}` }}>
                        <AvatarFallback style={{ backgroundColor: `${color}26`, color }}>
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      {!activeScreenShare && <span className="text-sm font-medium">{name}</span>}
                    </>
                  )}
                  {tile.videoTrack && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium">
                      {name}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      ) : (
        // Voice call — plain phone-call screen, no video grid at all: a
        // stack of avatars (you + everyone else already connected).
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <motion.div
              variants={meetingTileIn(reduced, 0)}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <Avatar size="lg" className="size-20">
                  <AvatarFallback className="text-xl">Eu</AvatarFallback>
                </Avatar>
                {!micOn && (
                  <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground">
                    <MicOffIcon className="size-3.5" />
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">Você</span>
            </motion.div>

            {remoteList.map((tile, index) => {
              const member = rosterById.get(tile.identity)
              const name = member?.name ?? tile.name
              const color = hashColor(tile.identity)
              return (
                <motion.div
                  key={tile.identity}
                  variants={meetingTileIn(reduced, index + 1)}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col items-center gap-2"
                >
                  <Avatar size="lg" className="size-20" style={{ boxShadow: `0 0 0 2px ${color}` }}>
                    <AvatarFallback className="text-xl" style={{ backgroundColor: `${color}26`, color }}>
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{name}</span>
                  <audio
                    ref={(el) => {
                      if (el) remoteAudioRefs.current.set(tile.identity, el)
                      else remoteAudioRefs.current.delete(tile.identity)
                      if (el && tile.audioTrack) tile.audioTrack.attach(el)
                    }}
                    autoPlay
                  />
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      <motion.div
        variants={meetingControlBarIn(reduced)}
        initial="hidden"
        animate="show"
        className="flex items-center justify-center gap-2 self-center rounded-full border bg-card p-2 shadow-sm"
      >
        <Button
          type="button"
          size="icon-lg"
          variant={micOn ? "default" : "outline"}
          className="rounded-full"
          onClick={toggleMic}
        >
          {micOn ? <MicIcon /> : <MicOffIcon />}
          <span className="sr-only">{micOn ? "Mutar microfone" : "Ativar microfone"}</span>
        </Button>
        {isVideoCall && (
          <>
            <Button
              type="button"
              size="icon-lg"
              variant={cameraOn ? "default" : "outline"}
              className="rounded-full"
              onClick={toggleCamera}
            >
              {cameraOn ? <VideoIcon /> : <VideoOffIcon />}
              <span className="sr-only">{cameraOn ? "Desligar câmera" : "Ligar câmera"}</span>
            </Button>
            <Button
              type="button"
              size="icon-lg"
              variant={screenSharing ? "default" : "outline"}
              className="rounded-full"
              onClick={toggleScreenShare}
            >
              {screenSharing ? <MonitorXIcon /> : <MonitorUpIcon />}
              <span className="sr-only">{screenSharing ? "Parar compartilhamento" : "Compartilhar tela"}</span>
            </Button>
          </>
        )}
        <DeviceMenu room={room} />
        <Button type="button" size="icon-lg" variant="destructive" className="rounded-full" onClick={handleEnd}>
          <PhoneOffIcon />
          <span className="sr-only">Encerrar chamada</span>
        </Button>
        </motion.div>
      </div>
    </>
  )
}
