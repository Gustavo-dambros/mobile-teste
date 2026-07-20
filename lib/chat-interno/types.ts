export type ConversationKind = "dm" | "group"

export interface Conversation {
  id: string
  kind: ConversationKind
  /** dm: only the other member; group: every member except the current user. Real profile ids. */
  memberIds: string[]
  /** group only */
  name?: string
  description?: string
  /** group only — includes the current user's own id when they're an admin. */
  adminIds: string[]
  createdBy: string
  createdAt: string
  /** group only — set when the current user left; kept for history, hidden from the active list. */
  leftAt?: string
}

export type MessageStatus = "sent" | "delivered" | "seen"
export type AttachmentKind = "image" | "video" | "document" | "audio"

export interface ChatAttachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
  mimeType: string
  /** Local preview URL today (URL.createObjectURL); becomes the storage URL once uploaded for real. */
  url: string
  durationSeconds?: number
}

export type SystemEvent =
  | "group_created"
  | "member_added"
  | "member_removed"
  | "member_left"
  | "name_changed"
  | "call_log"

export interface SystemMeta {
  memberId?: string
  memberName?: string
  callKind?: "audio" | "video"
  callOutcome?: "completed" | "missed" | "declined"
  durationSeconds?: number
}

export interface ChatMessage {
  id: string
  conversationId: string
  authorId: string
  authorName: string
  isOwn: boolean
  text: string
  createdAt: string
  editedAt?: string
  deletedForEveryone?: boolean
  deletedForMe?: boolean
  status: MessageStatus
  attachments: ChatAttachment[]
  replyToId?: string
  /** emoji -> list of author ids who reacted with it */
  reactions: Record<string, string[]>
  kind: "message" | "system"
  systemEvent?: SystemEvent
  systemMeta?: SystemMeta
}

export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed"
export type CallParticipantStatus = "ringing" | "active" | "declined" | "missed" | "left"

export interface CallParticipant {
  id: string
  callId: string
  userId: string
  status: CallParticipantStatus
  joinedAt?: string
  endedAt?: string
}

export interface Call {
  id: string
  conversationId: string
  kind: "audio" | "video"
  callerId: string
  status: CallStatus
  roomName: string
  startedAt: string
  answeredAt?: string
  endedAt?: string
  /**
   * Per-participant ringing/active/declined/missed state — a group call has
   * one shared row above, but each invited member answers independently, so
   * "am I ringing/active" is derived from my own entry here, not `status`.
   */
  participants: CallParticipant[]
}

export interface TypingEntry {
  conversationId: string
  userId: string
  userName: string
  expiresAt: number
}

export interface PinnedMessage {
  messageId: string
  pinnedById: string
  pinnedByName: string
  pinnedAt: string
  message?: ChatMessage
}
