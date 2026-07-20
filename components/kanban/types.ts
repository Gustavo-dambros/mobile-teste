export type BoardBackgroundType = "color" | "cover"

export interface KanbanBoard {
  id: string
  userId: string
  title: string
  description?: string
  backgroundType: BoardBackgroundType
  backgroundValue: string
  isDefault: boolean
  position: number
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface KanbanColumn {
  id: string
  boardId: string
  title: string
  position: number
  color?: string
  isDoneColumn: boolean
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export type CardPriority = "baixa" | "media" | "alta" | "urgente"

export type ReminderType = "no_horario" | "10min" | "30min" | "1h" | "1dia" | "2dias" | "personalizado"

export type RecurrenceType = "none" | "diaria" | "semanal" | "mensal" | "anual" | "personalizado"

export type CardCoverType = "none" | "color" | "image"

export interface KanbanCard {
  id: string
  boardId: string
  columnId: string
  userId: string
  title: string
  description?: string
  position: number
  priority: CardPriority
  startAt?: string
  dueAt?: string
  completedAt?: string
  reminderType?: ReminderType
  reminderCustomMinutes?: number
  recurrenceType?: RecurrenceType
  recurrenceCustomDays?: number
  coverType: CardCoverType
  coverValue?: string
  labelIds: string[]
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface KanbanLabel {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface KanbanChecklist {
  id: string
  cardId: string
  title: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface KanbanChecklistItem {
  id: string
  checklistId: string
  title: string
  isCompleted: boolean
  position: number
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type KanbanAttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "archive"
  | "other"

export interface KanbanAttachment {
  id: string
  cardId?: string
  commentId?: string
  userId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  kind: KanbanAttachmentKind
  /** Local preview URL today (URL.createObjectURL); becomes the storage URL once uploaded for real. */
  storageUrl: string
  isCover: boolean
  createdAt: string
}

export interface KanbanComment {
  id: string
  cardId: string
  userId: string
  content: string
  editedAt?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export type KanbanActivityAction =
  | "card_created"
  | "title_changed"
  | "description_changed"
  | "priority_changed"
  | "due_date_set"
  | "due_date_changed"
  | "due_date_removed"
  | "moved_column"
  | "label_added"
  | "label_removed"
  | "attachment_added"
  | "attachment_removed"
  | "checklist_added"
  | "checklist_removed"
  | "checklist_completed"
  | "comment_added"
  | "comment_edited"
  | "comment_deleted"
  | "card_completed"
  | "card_reopened"
  | "card_archived"
  | "card_restored"

export interface KanbanActivityLogEntry {
  id: string
  cardId: string
  userId: string
  action: KanbanActivityAction
  field?: string
  oldValue?: string
  newValue?: string
  createdAt: string
}

export type KanbanNotificationType = "due_reminder" | "due_now" | "overdue"

export interface KanbanNotification {
  id: string
  userId: string
  boardId: string
  cardId: string
  type: KanbanNotificationType
  title: string
  message: string
  scheduledAt: string
  displayedAt?: string
  readAt?: string
  snoozedUntil?: string
  dismissedAt?: string
  createdAt: string
  updatedAt: string
}
