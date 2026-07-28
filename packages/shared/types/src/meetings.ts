export type MeetingStatus = "agendada" | "ativa" | "encerrada"

export type ParticipantKind = "registered" | "guest"

export type MeetingRecurrenceType = "none" | "daily" | "weekly" | "monthly"

export interface MeetingParticipant {
  id: string
  kind: ParticipantKind
  userId?: string
  name: string
  email?: string
  joinedAt: string
  micOn: boolean
  micLocked: boolean
  cameraOn: boolean
  cameraLocked: boolean
  screenSharing: boolean
  handRaised: boolean
}

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
  inviteToken: string
  status: MeetingStatus
  scheduledFor?: string
  recurrenceType: MeetingRecurrenceType
  recurrenceGroupId?: string
  locked: boolean
  activeScreenShareParticipantId?: string
  isRecording: boolean
  latestRecording?: MeetingRecordingSummary
  invitedUserIds: string[]
  participants: MeetingParticipant[]
  waitingGuests: WaitingGuest[]
  chatMessages: MeetingChatMessage[]
  hasPassword: boolean
  guestPermissions: GuestPermissions
  durationMinutes?: number
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
  password?: string
  scheduledFor?: string
  recurrenceType?: MeetingRecurrenceType
  recurrenceUntil?: string
  notifyInvite?: boolean
  guestPermissions?: Partial<GuestPermissions>
  durationMinutes?: number
}
