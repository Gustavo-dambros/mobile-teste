"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  CheckIcon,
  CrownIcon,
  HandIcon,
  HistoryIcon,
  LinkIcon,
  LockIcon,
  LockOpenIcon,
  MicIcon,
  MicOffIcon,
  MoreVerticalIcon,
  RefreshCwIcon,
  Share2Icon,
  UserCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
  VideoIcon,
  VideoOffIcon,
  XIcon,
} from "lucide-react"

import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { usePresenceMap } from "@/lib/team/use-presence-map"
import { useCurrentUser } from "@/lib/current-user/context"
import { participantInitials, useReunioes } from "@/lib/reunioes/store"
import type { Meeting } from "@/lib/reunioes/types"
import { RosterMultiSelect } from "@/components/chat-interno/RosterMultiSelect"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function inviteLinkFor(meeting: Meeting) {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/reunioes/entrar/${meeting.inviteToken}`
}

const ACTIVITY_LABELS: Record<string, (targetLabel: string | null) => string> = {
  start_recording: () => "iniciou a gravação",
  stop_recording: () => "parou a gravação",
  mute_all: () => "silenciou todos os participantes",
  remove_participant: (t) => `removeu ${t ?? "um participante"}`,
  unlock_mic: (t) => `permitiu ${t ?? "um participante"} desmutar`,
  unlock_camera: (t) => `permitiu ${t ?? "um participante"} ligar a câmera`,
  regenerate_invite_link: () => "gerou um novo link de convite",
  extend_duration: () => "adicionou tempo à reunião",
  unblock_participant: (t) => `convidou ${t ?? "alguém"} novamente`,
  lock_meeting: () => "bloqueou a entrada na reunião",
  unlock_meeting: () => "desbloqueou a entrada na reunião",
}

function activityLabel(action: string, targetLabel: string | null) {
  return ACTIVITY_LABELS[action]?.(targetLabel) ?? action
}

function PresenceDot({ presence }: { presence: string | undefined }) {
  const color =
    presence === "Online"
      ? "bg-emerald-500"
      : presence === "Ocupado"
        ? "bg-red-500"
        : presence === "Ausente"
          ? "bg-amber-500"
          : "bg-muted-foreground/40"
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={`size-2 rounded-full ${color}`} />} />
      <TooltipContent>{presence ?? "Offline"}</TooltipContent>
    </Tooltip>
  )
}

export function ParticipantsPanel({
  meetingId,
  isHost,
  localParticipantId,
  open,
  onOpenChange,
}: {
  meetingId: string
  isHost: boolean
  localParticipantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    getMeeting,
    refreshMeeting,
    admitGuest,
    denyGuest,
    muteParticipant,
    unlockMic,
    lockCamera,
    unlockCamera,
    removeParticipant,
    promoteHost,
    muteAll,
    lockMeeting,
    inviteParticipants,
    regenerateInviteLink,
  } = useReunioes()
  const meeting = getMeeting(meetingId)
  const roster = useChatRoster()
  const presence = usePresenceMap()
  const currentUser = useCurrentUser()

  const [addOpen, setAddOpen] = React.useState(false)
  const [addSelection, setAddSelection] = React.useState<string[]>([])
  const [inviting, setInviting] = React.useState(false)
  const [regenerating, setRegenerating] = React.useState(false)
  const [blocked, setBlocked] = React.useState<
    { id: string; userId: string | null; email: string | null; name: string }[]
  >([])

  const [blockedReloadToken, setBlockedReloadToken] = React.useState(0)

  const [activityOpen, setActivityOpen] = React.useState(false)
  const [activity, setActivity] = React.useState<
    { id: string; action: string; targetLabel: string | null; actorName: string; createdAt: string }[] | null
  >(null)

  React.useEffect(() => {
    if (!activityOpen || !isHost) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/reunioes/${meetingId}/activity`)
        const data = await res.json()
        if (!cancelled && res.ok) setActivity(data.activity ?? [])
      } catch {
        if (!cancelled) setActivity([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activityOpen, isHost, meetingId])

  React.useEffect(() => {
    if (!open || !isHost) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/reunioes/${meetingId}/blocked`)
        const data = await res.json()
        if (!cancelled && res.ok) setBlocked(data.blocked ?? [])
      } catch {
        // silent — the panel just shows an empty "Bloqueados" section
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, isHost, meetingId, blockedReloadToken])

  async function handleUnblock(entry: { userId: string | null; email: string | null; name: string }) {
    try {
      const res = await fetch(`/api/reunioes/${meetingId}/unblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: entry.userId ?? undefined, email: entry.email ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
      toast.success(`${entry.name} foi convidado novamente`)
      setBlockedReloadToken((t) => t + 1)
      refreshMeeting(meetingId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reenviar o convite")
    }
  }

  const rosterById = React.useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster])

  const notYetJoined = React.useMemo(() => {
    if (!meeting) return []
    const joinedUserIds = new Set(meeting.participants.map((p) => p.userId).filter(Boolean))
    return meeting.invitedUserIds.filter((uid) => !joinedUserIds.has(uid))
  }, [meeting])

  const inviteCandidates = React.useMemo(() => {
    if (!meeting) return roster
    const excluded = new Set([
      ...meeting.invitedUserIds,
      ...meeting.participants.map((p) => p.userId).filter(Boolean),
      currentUser?.id,
    ])
    return roster.filter((m) => !excluded.has(m.id))
  }, [roster, meeting, currentUser?.id])

  if (!meeting) return null

  function handleCopyLink() {
    if (!meeting) return
    navigator.clipboard.writeText(inviteLinkFor(meeting))
    toast.success("Link de convite copiado")
  }

  async function handleShareLink() {
    if (!meeting) return
    const url = inviteLinkFor(meeting)
    if (navigator.share) {
      try {
        await navigator.share({ title: meeting.title, url })
      } catch {
        // user cancelled the native share sheet — nothing to report
      }
    } else {
      handleCopyLink()
    }
  }

  async function handleRegenerateLink() {
    setRegenerating(true)
    const result = await regenerateInviteLink(meetingId)
    setRegenerating(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível gerar um novo link")
      return
    }
    toast.success("Novo link gerado. O link anterior não admite mais ninguém.")
  }

  async function handleMuteAll() {
    const result = await muteAll(meetingId, currentUser?.name)
    if (!result.ok) toast.error(result.error ?? "Não foi possível silenciar os participantes")
  }

  async function handleInvite() {
    if (addSelection.length === 0) return
    setInviting(true)
    const result = await inviteParticipants(meetingId, addSelection)
    setInviting(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível convidar")
      return
    }
    toast.success("Convite enviado")
    setAddSelection([])
    setAddOpen(false)
  }

  const linkStatus = meeting.status === "encerrada" ? "Encerrada" : meeting.locked ? "Bloqueada" : "Ativa"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Participantes</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {isHost && meeting.status !== "encerrada" && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Link de convite</span>
                <Badge variant={linkStatus === "Ativa" ? "default" : "outline"}>{linkStatus}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1.5 text-xs">
                  {inviteLinkFor(meeting)}
                </code>
                <Button type="button" variant="outline" size="icon-sm" onClick={handleCopyLink}>
                  <LinkIcon />
                  <span className="sr-only">Copiar link</span>
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={handleShareLink}>
                  <Share2Icon />
                  <span className="sr-only">Compartilhar link</span>
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start text-xs"
                disabled={regenerating}
                onClick={handleRegenerateLink}
              >
                <RefreshCwIcon data-icon="inline-start" />
                Gerar novo link
              </Button>
            </div>
          )}

          {isHost && meeting.waitingGuests.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Sala de espera ({meeting.waitingGuests.length})</span>
              <div className="flex flex-col gap-2">
                {meeting.waitingGuests.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{g.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{g.email}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => admitGuest(meetingId, g.id)}>
                        <CheckIcon />
                        <span className="sr-only">Admitir {g.name}</span>
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => denyGuest(meetingId, g.id)}>
                        <XIcon />
                        <span className="sr-only">Recusar {g.name}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {isHost && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleMuteAll}>
                  <MicOffIcon /> Silenciar todos
                </Button>
                <Button
                  type="button"
                  variant={meeting.locked ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => lockMeeting(meetingId, !meeting.locked)}
                >
                  {meeting.locked ? <LockIcon /> : <LockOpenIcon />}
                  {meeting.locked ? "Bloqueada" : "Bloquear"}
                </Button>
              </div>
              <RosterMultiSelect
                value={addSelection}
                onChange={(next) => {
                  setAddSelection(next)
                  setAddOpen(true)
                }}
                options={inviteCandidates}
                placeholder="Adicionar participantes"
              />
              {addOpen && addSelection.length > 0 && (
                <Button type="button" size="sm" onClick={handleInvite} disabled={inviting}>
                  <UserPlusIcon data-icon="inline-start" />
                  Convidar {addSelection.length} pessoa{addSelection.length > 1 ? "s" : ""}
                </Button>
              )}
              <Separator />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Na chamada ({meeting.participants.length})</span>
            {meeting.participants.map((p) => {
              const isSelf = p.id === localParticipantId
              const isOrganizer = !!p.userId && p.userId === meeting.hostId
              const rosterEntry = p.userId ? rosterById.get(p.userId) : undefined
              const sector = p.kind === "guest" ? "Convidado" : (rosterEntry?.sector ?? "")
              const presenceLabel = p.userId ? presence.get(p.userId) : undefined
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 py-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{participantInitials(p.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1 truncate text-sm">
                        {p.name}
                        {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}
                        {isOrganizer && (
                          <Tooltip>
                            <TooltipTrigger render={<CrownIcon className="size-3.5 text-amber-500" />} />
                            <TooltipContent>Anfitrião</TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                      {sector && <span className="truncate text-xs text-muted-foreground">{sector}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    {p.userId && <PresenceDot presence={presenceLabel} />}
                    {p.handRaised && <HandIcon className="size-3.5 text-amber-500" />}
                    {!p.micOn && <MicOffIcon className="size-3.5" />}
                    {!p.cameraOn && <VideoOffIcon className="size-3.5" />}
                    {isHost && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
                          <MoreVerticalIcon />
                          <span className="sr-only">Ações para {p.name}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {p.micOn && (
                            <DropdownMenuItem onClick={() => muteParticipant(meetingId, p.id)}>
                              <MicOffIcon /> Silenciar
                            </DropdownMenuItem>
                          )}
                          {!p.micOn && p.micLocked && (
                            <DropdownMenuItem onClick={() => unlockMic(meetingId, p.id)}>
                              <MicIcon /> Permitir desmutar
                            </DropdownMenuItem>
                          )}
                          {p.cameraOn && (
                            <DropdownMenuItem onClick={() => lockCamera(meetingId, p.id)}>
                              <VideoOffIcon /> Desligar câmera
                            </DropdownMenuItem>
                          )}
                          {!p.cameraOn && p.cameraLocked && (
                            <DropdownMenuItem onClick={() => unlockCamera(meetingId, p.id)}>
                              <VideoIcon /> Permitir ligar câmera
                            </DropdownMenuItem>
                          )}
                          {p.kind === "registered" && (
                            <DropdownMenuItem onClick={() => promoteHost(meetingId, p.id)}>
                              <CrownIcon /> Tornar anfitrião
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem variant="destructive" onClick={() => removeParticipant(meetingId, p.id)}>
                            <UserMinusIcon /> Remover da reunião
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {notYetJoined.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Convidados, ainda não entraram ({notYetJoined.length})</span>
              {notYetJoined.map((uid) => {
                const member = rosterById.get(uid)
                if (!member) return null
                return (
                  <div key={uid} className="flex items-center justify-between gap-2 py-1 opacity-70">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>{participantInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">{member.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{member.sector}</span>
                      </div>
                    </div>
                    <Badge variant="outline">Convidado</Badge>
                  </div>
                )
              })}
            </div>
          )}

          {isHost && blocked.length > 0 && (
            <div className="flex flex-col gap-2">
              <Separator />
              <span className="text-sm font-medium">Removidos ({blocked.length})</span>
              <p className="text-xs text-muted-foreground">
                Quem entrou convidado pode ser convidado de novo. Quem entrou pelo link só volta
                gerando um novo link.
              </p>
              {blocked.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 py-1 opacity-70">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{participantInitials(entry.name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{entry.name}</span>
                    <Badge variant="destructive">Removido</Badge>
                  </div>
                  {entry.userId ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => handleUnblock(entry)}>
                      <UserCheckIcon data-icon="inline-start" />
                      Convidar novamente
                    </Button>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">Só com link novo</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {isHost && (
            <div className="flex flex-col gap-2">
              <Separator />
              <button
                type="button"
                onClick={() => setActivityOpen((v) => !v)}
                className="flex items-center justify-between gap-2 text-sm font-medium"
              >
                Atividade
                <HistoryIcon className="size-3.5 text-muted-foreground" />
              </button>
              {activityOpen &&
                (activity === null ? (
                  <p className="text-xs text-muted-foreground">Carregando...</p>
                ) : activity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma ação registrada ainda.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activity.map((a) => (
                      <p key={a.id} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{a.actorName || "Alguém"}</span>{" "}
                        {activityLabel(a.action, a.targetLabel)}
                        {" · "}
                        {new Date(a.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
