export type ActivityItemType = "task" | "event"

export type TaskStatus = "pendente" | "em_andamento" | "concluida"

export type TaskPriority = "baixa" | "media" | "alta" | "urgente"

export type EventVisibility =
  | "setor"
  | "participantes"
  | "privado"
  | "convidados"
  | "setores_convidados"

export type RecurrenceFrequency = "diaria" | "semanal" | "mensal" | "anual"

export interface RecurrenceRule {
  freq: RecurrenceFrequency
  interval: number
  byWeekday?: number[]
  until?: string
  count?: number
}

export type RecurrenceEditScope = "this" | "this_and_following" | "all"

export type ActivityAttachmentKind = "image" | "video" | "document"

export interface ActivityAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  kind: ActivityAttachmentKind
  url: string
}

export interface TaskComment {
  id: string
  taskId: string
  authorId: string
  text: string
  createdAt: string
  editedAt?: string
  deletedAt?: string
  deletedById?: string
  parentId?: string
  mentionedUserIds: string[]
  attachments: ActivityAttachment[]
}

export interface ChecklistItem {
  id: string
  taskId: string
  text: string
  done: boolean
  position: number
  createdById: string
  createdAt: string
  doneAt?: string
  doneById?: string
}

export type HistoryAction =
  | "task_created"
  | "event_created"
  | "title_changed"
  | "description_changed"
  | "assignee_changed"
  | "due_date_changed"
  | "status_changed"
  | "priority_changed"
  | "comment_added"
  | "comment_edited"
  | "comment_deleted"
  | "attachment_added"
  | "attachment_removed"
  | "participant_added"
  | "participant_removed"
  | "task_archived"
  | "task_deleted"
  | "task_restored"
  | "event_changed"
  | "event_cancelled"

export interface HistoryEntry {
  id: string
  entityType: ActivityItemType
  entityId: string
  actorId: string
  actorName: string
  action: HistoryAction
  field?: string
  oldValue?: string
  newValue?: string
  createdAt: string
}

export interface Task {
  id: string
  number: string
  title: string
  description: string
  sector: string
  creatorId: string
  assigneeId: string
  watcherIds: string[]
  eventId: string
  startDate?: string
  dueDate?: string
  dueTime?: string
  status: TaskStatus
  priority: TaskPriority
  isPriority: boolean
  category?: string
  tags: string[]
  recurrence?: RecurrenceRule
  attachments: ActivityAttachment[]
  commentCount: number
  createdAt: string
  updatedAt: string
  archivedAt?: string
  archivedById?: string
  deletedAt?: string
  deletedById?: string
}

export type PresenceConfirmation = "confirmado" | "recusado"

export interface CalendarEvent {
  id: string
  number: string
  title: string
  description: string
  date: string
  startTime?: string
  endTime?: string
  allDay: boolean
  location?: string
  meetingLink?: string
  sector: string
  creatorId: string
  participantIds: string[]
  invitedUserIds: string[]
  invitedSectorIds: string[]
  visibility: EventVisibility
  color?: string
  category?: string
  tags: string[]
  recurrence?: RecurrenceRule
  reminders: { offsetMinutes: number }[]
  attachments: ActivityAttachment[]
  confirmations: Record<string, PresenceConfirmation>
  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedById?: string
  cancelledAt?: string
  cancelledById?: string
}

export type ActivityNotificationType =
  | "task_assigned"
  | "assignee_changed"
  | "due_date_changed"
  | "due_soon"
  | "task_overdue"
  | "comment_received"
  | "mention"
  | "status_changed"
  | "task_completed"
  | "task_reopened"
  | "event_invite"
  | "event_changed"
  | "event_cancelled"
  | "event_reminder"
  | "participant_removed"

export interface ActivityNotification {
  id: string
  type: ActivityNotificationType
  title: string
  message: string
  recipientUserId: string
  relatedType: ActivityItemType
  relatedId: string
  read: boolean
  createdAt: string
}

export interface TaskFormInput {
  title: string
  description: string
  sector: string
  assigneeId: string
  eventId: string
  startDate?: string
  dueDate?: string
  dueTime?: string
  priority: TaskPriority
  status: TaskStatus
  category?: string
  tags: string[]
  watcherIds: string[]
  isPriority: boolean
  notifyAssignee: boolean
  attachments: ActivityAttachment[]
  recurrence?: RecurrenceRule
}

export interface EventFormInput {
  title: string
  description: string
  date: string
  startTime?: string
  endTime?: string
  allDay: boolean
  location?: string
  meetingLink?: string
  sector: string
  participantIds: string[]
  invitedUserIds: string[]
  invitedSectorIds: string[]
  visibility: EventVisibility
  color?: string
  category?: string
  tags: string[]
  attachments: ActivityAttachment[]
  recurrence?: RecurrenceRule
  reminders: { offsetMinutes: number }[]
}
