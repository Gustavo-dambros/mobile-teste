"use client"

import * as React from "react"
import { toast } from "sonner"

import { broadcastMeetingSystemNote, broadcastMeetingUpdated, useMeetingActivity } from "@/lib/reunioes/realtime"
import { playMeetingInviteSound } from "@/lib/reunioes/notification-sound"
import { notifyBrowser } from "@/lib/notifications/browser-notifications"
import type {
  CreateMeetingInput,
  Meeting,
  MeetingInviteNotification,
  MeetingParticipant,
  MeetingRecordingSummary,
} from "@/lib/reunioes/types"

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface InviteStatus {
  status: "open" | "waiting" | "admitted" | "denied" | "ended" | "not_started"
  meetingId?: string
  meetingTitle?: string
  requiresPassword?: boolean
  scheduledFor?: string
  latestRecording?: MeetingRecordingSummary
}

const LIST_POLL_INTERVAL_MS = 8_000
const MEETING_POLL_INTERVAL_MS = 4_000
const INVITE_POLL_INTERVAL_MS = 3_000
const INVITE_NOTIFICATIONS_POLL_INTERVAL_MS = 15_000

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
  return data as T
}

interface ReunioesContextValue {
  meetings: Meeting[]
  getMeeting: (id: string) => Meeting | undefined

  refreshMeetings: () => Promise<void>
  refreshMeeting: (meetingId: string) => Promise<void>
  fetchInviteStatus: (token: string, guestId?: string) => Promise<InviteStatus>

  createMeeting: (input: CreateMeetingInput) => Promise<ActionResult & { meeting?: Meeting }>
  endMeeting: (meetingId: string) => Promise<ActionResult>
  /** Pushes the auto-end deadline further out — only meaningful once a duration is set. */
  extendMeeting: (meetingId: string, minutes: number) => Promise<ActionResult>

  joinAsRegisteredUser: (
    meetingId: string
  ) => Promise<ActionResult & { participantId?: string; notStarted?: boolean }>
  sendGuestEntryOtp: (
    token: string,
    name: string,
    email: string,
    password?: string
  ) => Promise<ActionResult>
  requestGuestEntry: (
    token: string,
    name: string,
    email: string,
    code: string,
    password?: string
  ) => Promise<ActionResult & { guestId?: string }>
  admitGuest: (meetingId: string, guestId: string) => Promise<ActionResult>
  denyGuest: (meetingId: string, guestId: string) => Promise<ActionResult>
  leaveMeeting: (meetingId: string, participantId: string) => Promise<void>

  setParticipantMic: (meetingId: string, participantId: string, micOn: boolean) => Promise<void>
  setParticipantCamera: (meetingId: string, participantId: string, cameraOn: boolean) => Promise<void>
  /** Screen share is exclusive server-side — resolves to { ok: false } (with the current
   * sharer's name in `error`) when someone else already holds it, so the caller can revert
   * the local LiveKit publish instead of leaving it dangling. */
  setParticipantScreenShare: (
    meetingId: string,
    participantId: string,
    screenSharing: boolean
  ) => Promise<ActionResult>
  setHandRaised: (meetingId: string, participantId: string, handRaised: boolean) => Promise<void>

  muteParticipant: (meetingId: string, participantId: string) => Promise<ActionResult>
  /** Clears a participant's mic lock (see muteParticipant/muteAll) — doesn't turn
   * their mic on, just allows them to do it themselves again. */
  unlockMic: (meetingId: string, participantId: string) => Promise<ActionResult>
  lockCamera: (meetingId: string, participantId: string) => Promise<ActionResult>
  /** Clears a participant's camera lock — same rule as unlockMic. */
  unlockCamera: (meetingId: string, participantId: string) => Promise<ActionResult>
  removeParticipant: (meetingId: string, participantId: string) => Promise<ActionResult>
  promoteHost: (meetingId: string, participantId: string) => Promise<ActionResult>
  /** actorName, when passed, surfaces a best-effort "Fulano silenciou todos" toast to everyone
   * currently connected to the realtime channel (see lib/reunioes/realtime.ts). */
  muteAll: (meetingId: string, actorName?: string) => Promise<ActionResult>
  lockMeeting: (meetingId: string, locked: boolean) => Promise<ActionResult>
  inviteParticipants: (meetingId: string, userIds: string[]) => Promise<ActionResult>
  /** Rotates the invite link — the old one stops admitting new entrants. The only way
   * to let a removed link-guest back in (see ParticipantsPanel's "Removidos" list). */
  regenerateInviteLink: (meetingId: string) => Promise<ActionResult>
  startRecording: (meetingId: string) => Promise<ActionResult>
  stopRecording: (meetingId: string) => Promise<ActionResult>

  sendChatMessage: (
    meetingId: string,
    participantId: string,
    text: string,
    attachment?: { url: string; name: string }
  ) => Promise<ActionResult>
  uploadChatAttachment: (
    meetingId: string,
    participantId: string,
    file: File
  ) => Promise<ActionResult & { url?: string; name?: string }>

  /** Unread meeting invites for the current user — backs the sidebar badge and
   * components/reunioes/MeetingInviteModal.tsx. */
  inviteNotifications: MeetingInviteNotification[]
  /** Session-only "Fechar" set — stays unread/counted, just hidden from the modal
   * until the next reload, per the explicit "fechar temporariamente" requirement. */
  snoozedInviteNotificationIds: Set<string>
  snoozeInviteNotification: (id: string) => void
  /** Marks read without changing accept/decline status — used by "Ver detalhes". */
  viewInviteNotification: (id: string) => Promise<void>
  respondToInvite: (id: string, status: "accepted" | "declined") => Promise<ActionResult>
}

const ReunioesContext = React.createContext<ReunioesContextValue | null>(null)

export function ReunioesProvider({
  children,
  guest = false,
}: {
  children: React.ReactNode
  /** Public invite-link flow (no session): skips the polls that only make sense for a
   * logged-in user (meeting list for the sidebar badge, invite notifications) — those
   * routes require auth and would 401 for an anonymous guest. */
  guest?: boolean
}) {
  const [meetingsMap, setMeetingsMap] = React.useState<Record<string, Meeting>>({})
  const mapRef = React.useRef(meetingsMap)
  React.useEffect(() => {
    mapRef.current = meetingsMap
  }, [meetingsMap])

  const hydrateMeeting = React.useCallback((meeting: Meeting) => {
    setMeetingsMap((prev) => ({ ...prev, [meeting.id]: meeting }))
  }, [])

  /** Applies a local patch to an already-known meeting and returns the result, or null if unknown. */
  const patchMeeting = React.useCallback(
    (meetingId: string, patch: (m: Meeting) => Meeting): Meeting | null => {
      const current = mapRef.current[meetingId]
      if (!current) return null
      const next = patch(current)
      hydrateMeeting(next)
      return next
    },
    [hydrateMeeting]
  )

  // refreshMeeting is defined further down (needs hydrateMeeting + api()) — a ref lets
  // this early useMeetingActivity subscription call the *current* one without having to
  // hoist that whole definition above it. Reassigned every render, always current by
  // the time any realtime event actually fires.
  const refreshMeetingRef = React.useRef<(meetingId: string) => Promise<void>>(async () => {})

  // The broadcast payload is just an id now (see lib/reunioes/realtime.ts for why) — on
  // notice, re-fetch over the authenticated REST API rather than trusting broadcast
  // content. Only for meetings we already know about — brand-new meetings arrive via
  // the list poll, same reasoning chat-interno uses for conversations.
  useMeetingActivity(
    React.useCallback((meetingId: string) => {
      if (mapRef.current[meetingId]) refreshMeetingRef.current(meetingId)
    }, [])
  )

  const meetings = React.useMemo(
    () => Object.values(meetingsMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [meetingsMap]
  )

  const getMeeting = React.useCallback(
    (id: string) => meetingsMap[id],
    [meetingsMap]
  )

  const refreshMeetings = React.useCallback(async () => {
    try {
      const data = await api<{ meetings: Meeting[] }>("/api/reunioes")
      setMeetingsMap((prev) => {
        const next = { ...prev }
        for (const m of data.meetings) next[m.id] = m
        return next
      })
    } catch {
      // silent — poll retries
    }
  }, [])

  // Global, provider-level poll (not owned by ReunioesPage) — the sidebar badge and the
  // central invite modal need meeting titles/details even when the user never visits /reunioes.
  // Inlined rather than calling the `refreshMeetings` callback above, since it's the same fetch.
  React.useEffect(() => {
    if (guest) return

    let cancelled = false

    async function poll() {
      try {
        const data = await api<{ meetings: Meeting[] }>("/api/reunioes")
        if (cancelled) return
        setMeetingsMap((prev) => {
          const next = { ...prev }
          for (const m of data.meetings) next[m.id] = m
          return next
        })
      } catch {
        // silent — poll retries
      }
    }

    poll()
    const interval = window.setInterval(poll, LIST_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [guest])

  const [inviteNotifications, setInviteNotifications] = React.useState<MeetingInviteNotification[]>([])
  const [snoozedInviteNotificationIds, setSnoozedInviteNotificationIds] = React.useState<Set<string>>(new Set())
  const knownInviteNotificationIdsRef = React.useRef<Set<string> | null>(null)

  React.useEffect(() => {
    if (guest) return

    let cancelled = false

    async function poll() {
      try {
        const data = await api<{ notifications: MeetingInviteNotification[] }>("/api/reunioes/invite-notifications")
        if (cancelled) return
        if (knownInviteNotificationIdsRef.current) {
          for (const n of data.notifications) {
            if (knownInviteNotificationIdsRef.current.has(n.id)) continue
            const meeting = mapRef.current[n.meetingId]
            playMeetingInviteSound()
            notifyBrowser(
              "Convite para reunião",
              meeting ? `Você foi convidado para "${meeting.title}"` : "Você recebeu um novo convite para uma reunião",
              { tag: `meeting-invite-${n.id}` }
            )
          }
        }
        knownInviteNotificationIdsRef.current = new Set(data.notifications.map((n) => n.id))
        setInviteNotifications(data.notifications)
      } catch {
        // silent — poll retries
      }
    }

    poll()
    const interval = window.setInterval(poll, INVITE_NOTIFICATIONS_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [guest])

  const snoozeInviteNotification = React.useCallback((id: string) => {
    setSnoozedInviteNotificationIds((prev) => new Set(prev).add(id))
  }, [])

  const viewInviteNotification = React.useCallback(async (id: string) => {
    setInviteNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await api(`/api/reunioes/invite-notifications/${id}/read`, { method: "POST" })
    } catch {
      // best-effort — worst case it reappears on the next poll
    }
  }, [])

  const respondToInvite = React.useCallback(
    async (id: string, status: "accepted" | "declined"): Promise<ActionResult> => {
      setInviteNotifications((prev) => prev.filter((n) => n.id !== id))
      try {
        await api(`/api/reunioes/invite-notifications/${id}/respond`, {
          method: "POST",
          body: JSON.stringify({ status }),
        })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const refreshMeeting = React.useCallback(
    async (meetingId: string) => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}`)
        hydrateMeeting(data.meeting)
      } catch {
        // silent — poll retries
      }
    },
    [hydrateMeeting]
  )
  refreshMeetingRef.current = refreshMeeting

  const fetchInviteStatus = React.useCallback(
    async (token: string, guestId?: string): Promise<InviteStatus> => {
      const qs = guestId ? `?guestId=${encodeURIComponent(guestId)}` : ""
      const data = await api<{
        status: InviteStatus["status"]
        meeting?:
          | Meeting
          | { id: string; title: string; status: string; latestRecording?: MeetingRecordingSummary }
        requiresPassword?: boolean
        scheduledFor?: string
      }>(`/api/reunioes/invite/${token}${qs}`)
      if (data.status === "admitted" && data.meeting && "participants" in data.meeting) {
        hydrateMeeting(data.meeting)
      }
      return {
        status: data.status,
        meetingId: data.meeting?.id,
        meetingTitle: data.meeting?.title,
        requiresPassword: data.requiresPassword,
        scheduledFor: data.scheduledFor,
        latestRecording: data.meeting?.latestRecording,
      }
    },
    [hydrateMeeting]
  )

  const createMeeting = React.useCallback(
    async (input: CreateMeetingInput): Promise<ActionResult & { meeting?: Meeting }> => {
      try {
        const data = await api<{ meeting: Meeting }>("/api/reunioes", {
          method: "POST",
          body: JSON.stringify(input),
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true, meeting: data.meeting }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const endMeeting = React.useCallback(
    async (meetingId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}/end`, {
          method: "POST",
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const extendMeeting = React.useCallback(
    async (meetingId: string, minutes: number): Promise<ActionResult> => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}/extend`, {
          method: "POST",
          body: JSON.stringify({ minutes }),
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const joinAsRegisteredUser = React.useCallback(
    async (meetingId: string): Promise<ActionResult & { participantId?: string; notStarted?: boolean }> => {
      try {
        const data = await api<{ participantId?: string; notStarted?: boolean; meeting: Meeting }>(
          `/api/reunioes/${meetingId}/join`,
          { method: "POST" }
        )
        hydrateMeeting(data.meeting)
        if (!data.notStarted) broadcastMeetingUpdated(data.meeting.id)
        return { ok: true, participantId: data.participantId, notStarted: data.notStarted }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const sendGuestEntryOtp = React.useCallback(
    async (token: string, name: string, email: string, password?: string): Promise<ActionResult> => {
      try {
        await api(`/api/reunioes/invite/${token}/send-otp`, {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const requestGuestEntry = React.useCallback(
    async (
      token: string,
      name: string,
      email: string,
      code: string,
      password?: string
    ): Promise<ActionResult & { guestId?: string }> => {
      try {
        const data = await api<{ guestId: string }>(`/api/reunioes/invite/${token}/request`, {
          method: "POST",
          body: JSON.stringify({ name, email, password, code }),
        })
        return { ok: true, guestId: data.guestId }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const admitGuest = React.useCallback(
    async (meetingId: string, guestId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}/admit`, {
          method: "POST",
          body: JSON.stringify({ guestId }),
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const denyGuest = React.useCallback(
    async (meetingId: string, guestId: string): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        waitingGuests: m.waitingGuests.filter((g) => g.id !== guestId),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        await api(`/api/reunioes/${meetingId}/deny`, {
          method: "POST",
          body: JSON.stringify({ guestId }),
        })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const leaveMeeting = React.useCallback(
    async (meetingId: string, participantId: string) => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.filter((p) => p.id !== participantId),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        await api(`/api/reunioes/${meetingId}/leave`, {
          method: "POST",
          body: JSON.stringify({ participantId }),
        })
      } catch {
        // best-effort — the meeting is already gone locally either way
      }
    },
    [patchMeeting]
  )

  const setParticipantMedia = React.useCallback(
    async (
      meetingId: string,
      participantId: string,
      changes: Partial<Pick<MeetingParticipant, "micOn" | "cameraOn" | "handRaised">>
    ) => {
      const previous = mapRef.current[meetingId]
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.map((p) =>
          p.id === participantId ? { ...p, ...changes } : p
        ),
      }))
      if (next) broadcastMeetingUpdated(next.id)

      const attempt = () =>
        api(`/api/reunioes/${meetingId}/media`, {
          method: "PATCH",
          body: JSON.stringify({ participantId, ...changes }),
        })

      try {
        await attempt()
      } catch {
        try {
          await attempt()
        } catch {
          if (previous) hydrateMeeting(previous)
          toast.error("Não foi possível atualizar o estado do dispositivo. Tente novamente.")
        }
      }
    },
    [patchMeeting, hydrateMeeting]
  )

  const setParticipantMic = React.useCallback(
    (meetingId: string, participantId: string, micOn: boolean) =>
      setParticipantMedia(meetingId, participantId, { micOn }),
    [setParticipantMedia]
  )
  const setParticipantCamera = React.useCallback(
    (meetingId: string, participantId: string, cameraOn: boolean) =>
      setParticipantMedia(meetingId, participantId, { cameraOn }),
    [setParticipantMedia]
  )
  /** Not routed through setParticipantMedia's optimistic-patch-then-retry: the server enforces
   * exclusivity (409 when someone else already holds the lock), so the UI must react to the
   * *actual* outcome rather than assume success — the caller (MeetingRoom) undoes the local
   * LiveKit publish when this resolves { ok: false }. */
  const setParticipantScreenShare = React.useCallback(
    async (meetingId: string, participantId: string, screenSharing: boolean): Promise<ActionResult> => {
      try {
        await api(`/api/reunioes/${meetingId}/media`, {
          method: "PATCH",
          body: JSON.stringify({ participantId, screenSharing }),
        })
        const next = patchMeeting(meetingId, (m) => ({
          ...m,
          activeScreenShareParticipantId: screenSharing
            ? participantId
            : m.activeScreenShareParticipantId === participantId
              ? undefined
              : m.activeScreenShareParticipantId,
          participants: m.participants.map((p) => (p.id === participantId ? { ...p, screenSharing } : p)),
        }))
        if (next) broadcastMeetingUpdated(next.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )
  const setHandRaised = React.useCallback(
    (meetingId: string, participantId: string, handRaised: boolean) =>
      setParticipantMedia(meetingId, participantId, { handRaised }),
    [setParticipantMedia]
  )

  const muteParticipant = React.useCallback(
    async (meetingId: string, participantId: string): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.map((p) =>
          p.id === participantId ? { ...p, micOn: false, micLocked: true } : p
        ),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        await api(`/api/reunioes/${meetingId}/participants/${participantId}/mute`, { method: "POST" })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const unlockMic = React.useCallback(
    async (meetingId: string, participantId: string): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.map((p) => (p.id === participantId ? { ...p, micLocked: false } : p)),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        await api(`/api/reunioes/${meetingId}/participants/${participantId}/unlock-mic`, { method: "POST" })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const lockCamera = React.useCallback(
    async (meetingId: string, participantId: string): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.map((p) =>
          p.id === participantId ? { ...p, cameraOn: false, cameraLocked: true } : p
        ),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        await api(`/api/reunioes/${meetingId}/participants/${participantId}/lock-camera`, { method: "POST" })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const unlockCamera = React.useCallback(
    async (meetingId: string, participantId: string): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.map((p) => (p.id === participantId ? { ...p, cameraLocked: false } : p)),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        await api(`/api/reunioes/${meetingId}/participants/${participantId}/unlock-camera`, { method: "POST" })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const removeParticipant = React.useCallback(
    async (meetingId: string, participantId: string): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.filter((p) => p.id !== participantId),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        // A removed link-guest gets their invite link rotated server-side (see the
        // route) — hydrate the response so the host's own "copiar link" reflects the
        // new token immediately, instead of only finding out on the next full refresh.
        const data = await api<{ meeting?: Meeting }>(
          `/api/reunioes/${meetingId}/participants/${participantId}/remove`,
          { method: "POST" }
        )
        if (data.meeting) {
          hydrateMeeting(data.meeting)
          broadcastMeetingUpdated(data.meeting.id)
        }
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting, hydrateMeeting]
  )

  const promoteHost = React.useCallback(
    async (meetingId: string, participantId: string): Promise<ActionResult> => {
      try {
        await api(`/api/reunioes/${meetingId}/participants/${participantId}/promote`, { method: "POST" })
        await refreshMeeting(meetingId)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [refreshMeeting]
  )

  const muteAll = React.useCallback(
    async (meetingId: string, actorName?: string): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({
        ...m,
        participants: m.participants.map((p) =>
          p.userId === m.hostId ? p : { ...p, micOn: false, micLocked: true }
        ),
      }))
      if (next) broadcastMeetingUpdated(next.id)
      if (actorName) {
        broadcastMeetingSystemNote({ meetingId, message: `${actorName} silenciou todos os participantes.` })
      }
      try {
        await api(`/api/reunioes/${meetingId}/mute-all`, { method: "POST" })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const inviteParticipants = React.useCallback(
    async (meetingId: string, userIds: string[]): Promise<ActionResult> => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}/invite`, {
          method: "POST",
          body: JSON.stringify({ userIds }),
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const regenerateInviteLink = React.useCallback(
    async (meetingId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}/regenerate-link`, {
          method: "POST",
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const startRecording = React.useCallback(
    async (meetingId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}/recording/start`, {
          method: "POST",
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const stopRecording = React.useCallback(
    async (meetingId: string): Promise<ActionResult> => {
      try {
        const data = await api<{ meeting: Meeting }>(`/api/reunioes/${meetingId}/recording/stop`, {
          method: "POST",
        })
        hydrateMeeting(data.meeting)
        broadcastMeetingUpdated(data.meeting.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [hydrateMeeting]
  )

  const lockMeeting = React.useCallback(
    async (meetingId: string, locked: boolean): Promise<ActionResult> => {
      const next = patchMeeting(meetingId, (m) => ({ ...m, locked }))
      if (next) broadcastMeetingUpdated(next.id)
      try {
        await api(`/api/reunioes/${meetingId}/lock`, {
          method: "POST",
          body: JSON.stringify({ locked }),
        })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const sendChatMessage = React.useCallback(
    async (
      meetingId: string,
      participantId: string,
      text: string,
      attachment?: { url: string; name: string }
    ): Promise<ActionResult> => {
      const trimmed = text.trim()
      if (!trimmed && !attachment) return { ok: false, error: "Mensagem vazia" }
      try {
        const data = await api<{ message: Meeting["chatMessages"][number] }>(
          `/api/reunioes/${meetingId}/chat`,
          {
            method: "POST",
            body: JSON.stringify({
              participantId,
              text: trimmed,
              attachmentUrl: attachment?.url,
              attachmentName: attachment?.name,
            }),
          }
        )
        const next = patchMeeting(meetingId, (m) => ({
          ...m,
          chatMessages: [...m.chatMessages, data.message],
        }))
        if (next) broadcastMeetingUpdated(next.id)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    [patchMeeting]
  )

  const uploadChatAttachment = React.useCallback(
    async (
      meetingId: string,
      participantId: string,
      file: File
    ): Promise<ActionResult & { url?: string; name?: string }> => {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("participantId", participantId)
        const res = await fetch(`/api/reunioes/${meetingId}/chat/attachment`, {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
        return { ok: true, url: data.url, name: data.name }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const value = React.useMemo<ReunioesContextValue>(
    () => ({
      meetings,
      getMeeting,
      refreshMeetings,
      refreshMeeting,
      fetchInviteStatus,
      createMeeting,
      endMeeting,
      extendMeeting,
      joinAsRegisteredUser,
      sendGuestEntryOtp,
      requestGuestEntry,
      admitGuest,
      denyGuest,
      leaveMeeting,
      setParticipantMic,
      setParticipantCamera,
      setParticipantScreenShare,
      setHandRaised,
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
      startRecording,
      stopRecording,
      sendChatMessage,
      uploadChatAttachment,
      inviteNotifications,
      snoozedInviteNotificationIds,
      snoozeInviteNotification,
      viewInviteNotification,
      respondToInvite,
    }),
    [
      meetings,
      getMeeting,
      refreshMeetings,
      refreshMeeting,
      fetchInviteStatus,
      createMeeting,
      endMeeting,
      extendMeeting,
      joinAsRegisteredUser,
      sendGuestEntryOtp,
      requestGuestEntry,
      admitGuest,
      denyGuest,
      leaveMeeting,
      setParticipantMic,
      setParticipantCamera,
      setParticipantScreenShare,
      setHandRaised,
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
      startRecording,
      stopRecording,
      sendChatMessage,
      uploadChatAttachment,
      inviteNotifications,
      snoozedInviteNotificationIds,
      snoozeInviteNotification,
      viewInviteNotification,
      respondToInvite,
    ]
  )

  return <ReunioesContext.Provider value={value}>{children}</ReunioesContext.Provider>
}

export function useReunioes() {
  const ctx = React.useContext(ReunioesContext)
  if (!ctx) {
    throw new Error("useReunioes must be used within a ReunioesProvider")
  }
  return ctx
}

export { initials as participantInitials, LIST_POLL_INTERVAL_MS, MEETING_POLL_INTERVAL_MS, INVITE_POLL_INTERVAL_MS }
