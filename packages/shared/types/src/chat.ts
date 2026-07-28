export type ConversationKind = "dm" | "group"

export interface Conversation {
  id: string
  kind: ConversationKind
  memberIds: string[]
  name?: string
  description?: string
  adminIds: string[]
  createdBy: string
  createdAt: string
  leftAt?: string
}

export type ChatMessageStatus = "sent" | "delivered" | "seen"
export type ChatAttachmentKind = "image" | "video" | "document" | "audio"

export interface ChatAttachment {
  id: string
  name: string
  size: number
  kind: ChatAttachmentKind
  mimeType: string
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
  status: ChatMessageStatus
  attachments: ChatAttachment[]
  replyToId?: string
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
