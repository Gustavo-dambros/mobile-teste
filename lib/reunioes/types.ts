export type MeetingStatus = "agendada" | "ativa" | "encerrada"

export type ParticipantKind = "registered" | "guest"

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly"

export interface MeetingParticipant {
  id: string
  kind: ParticipantKind
  /** Present when kind === "registered" — id from profiles. */
  userId?: string
  name: string
  email?: string
  joinedAt: string
  micOn: boolean
  /** True when the host force-muted this participant — while true, they cannot
   * unmute themselves; only the host clearing it (unlockMic) allows that again. */
  micLocked: boolean
  cameraOn: boolean
  /** True when the host force-turned this participant's camera off — while true, they
   * cannot turn it back on themselves; only the host clearing it (unlockCamera) allows
   * that again. Same lock semantics as micLocked. */
  cameraLocked: boolean
  screenSharing: boolean
  handRaised: boolean
}

/** Controls what a link-invited guest (kind === "guest") may do — set by the host at
 * creation time. Doesn't affect registered participants (colleagues), who are always
 * allowed to chat and share screen. */
export interface GuestPermissions {
  chat: boolean
  screenShare: boolean
}

export interface WaitingGuest {
  id: string
  name: string
  email: string
  requestedAt: string
}

export interface MeetingChatMessage {
  id: string
  authorParticipantId: string
  authorName: string
  text: string
  createdAt: string
  attachmentUrl?: string
  attachmentName?: string
}

export interface Meeting {
  id: string
  title: string
  hostId: string
  hostName: string
  /** Used to build the public guest link: /reunioes/entrar/[inviteToken]. */
  inviteToken: string
  status: MeetingStatus
  /** Set when created for a future time; null means it was started immediately. */
  scheduledFor?: string
  recurrenceType: RecurrenceType
  /** Shares one id across every occurrence generated from the same recurring series. */
  recurrenceGroupId?: string
  locked: boolean
  /** meeting_participants.id of whoever currently holds the screen-share lock, or undefined if free. */
  activeScreenShareParticipantId?: string
  /** True while a meeting_recordings row for this meeting is still status='recording'. */
  isRecording: boolean
  /** Most recent recording started for this meeting, in any status — undefined if the
   * meeting was never recorded. Drives the "baixar gravação?" prompt on leave/end. */
  latestRecording?: MeetingRecordingSummary
  invitedUserIds: string[]
  participants: MeetingParticipant[]
  waitingGuests: WaitingGuest[]
  chatMessages: MeetingChatMessage[]
  hasPassword: boolean
  guestPermissions: GuestPermissions
  /** Minutes the host set at creation as this meeting's time budget — undefined means
   * no limit. Applies once the meeting actually starts (see endsAt). */
  durationMinutes?: number
  /** Absolute deadline computed when the meeting starts (now + durationMinutes, or on
   * an "adicionar tempo" extension) — undefined until started, or if durationMinutes
   * was never set. Once passed, the meeting auto-ends on the next read (see
   * autoEndIfOverdue in lib/reunioes/server.ts). */
  endsAt?: string
  createdAt: string
  endedAt?: string
}

export interface MeetingInviteNotification {
  id: string
  meetingId: string
  createdAt: string
}

export type RecordingStatus = "recording" | "processing" | "ready" | "failed" | "expired"

/** Minimal, always-visible pointer to a meeting's most recent recording — unlike the full
 * MeetingRecording (host/participant-only, via /api/reunioes/recordings), this rides along
 * on the Meeting object itself so even a link guest can tell "was this meeting recorded?"
 * without a separate authenticated fetch (see MeetingRoom's end/leave recording prompt). */
export interface MeetingRecordingSummary {
  id: string
  status: RecordingStatus
}

export interface MeetingRecording {
  id: string
  meetingId: string
  meetingTitle: string
  status: RecordingStatus
  startedByName: string
  startedAt: string
  endedAt?: string
  durationSeconds?: number
  fileSizeBytes?: number
  expiresAt?: string
}

export interface CreateMeetingInput {
  title: string
  invitedUserIds: string[]
  /** Optional entry password — guests joining via the invite link must provide it. */
  password?: string
  /** Omit (or leave undefined) to start the meeting immediately. */
  scheduledFor?: string
  recurrenceType?: RecurrenceType
  /** Required when recurrenceType !== "none" — bounds how many occurrences get generated. */
  recurrenceUntil?: string
  /** Whether invitedUserIds get the center-screen invite popup (MeetingInviteModal).
   * Defaults to true — they're still added as invitees either way, just silently. */
  notifyInvite?: boolean
  /** What someone who joins via the public invite link may do. Omit any key to keep
   * its default (true) — only registered participants are unaffected either way. */
  guestPermissions?: Partial<GuestPermissions>
  /** Time budget in minutes — omit for no limit. See Meeting.durationMinutes/endsAt. */
  durationMinutes?: number
}
