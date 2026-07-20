import "server-only"

import type {
  ActivityAttachment,
  ActivityNotificationType,
  CalendarEvent,
  ChecklistItem,
  HistoryAction,
  RecurrenceRule,
  Task,
  TaskComment,
} from "@/components/atividades-setor/types"
import type { SessionUser } from "@/lib/session"
import { getCurrentUser } from "@/lib/session-server"
import { canViewEvent, canViewTask } from "@/lib/atividades-setor/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

export class ActivitiesAuthError extends Error {
  constructor(message = "Não autenticado") {
    super(message)
    this.name = "ActivitiesAuthError"
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new ActivitiesAuthError()
  return user
}

// Supabase's untyped query builder infers to-one embedded relations as
// arrays since it can't see the FK's uniqueness — at runtime PostgREST still
// returns a single object. Normalize either shape here (same gotcha as
// lib/tickets/server.ts).
type Embed<T> = T | T[] | null
function one<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function activityNumber(n: number) {
  return `EV-${String(n).padStart(4, "0")}`
}

export function taskNumber(n: number) {
  return `TA-${String(n).padStart(4, "0")}`
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export const ACTIVITY_SELECT = `
  id, number, title, description, date, start_time, end_time, all_day, location,
  meeting_link, sector, creator_id, participant_ids, invited_user_ids, invited_sector_ids,
  visibility, color, category, tags, recurrence, reminders, attachments, confirmations,
  created_at, updated_at, deleted_at, deleted_by_id, cancelled_at, cancelled_by_id
`

interface ActivityRow {
  id: string
  number: number
  title: string
  description: string
  date: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  location: string | null
  meeting_link: string | null
  sector: string
  creator_id: string
  participant_ids: string[]
  invited_user_ids: string[]
  invited_sector_ids: string[]
  visibility: string
  color: string | null
  category: string | null
  tags: string[]
  recurrence: RecurrenceRule | null
  reminders: { offsetMinutes: number }[]
  attachments: ActivityAttachment[]
  confirmations: Record<string, string>
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by_id: string | null
  cancelled_at: string | null
  cancelled_by_id: string | null
}

export function mapActivityRow(row: ActivityRow): CalendarEvent {
  return {
    id: row.id,
    number: activityNumber(row.number),
    title: row.title,
    description: row.description,
    date: row.date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    allDay: row.all_day,
    location: row.location ?? undefined,
    meetingLink: row.meeting_link ?? undefined,
    sector: row.sector,
    creatorId: row.creator_id,
    participantIds: row.participant_ids ?? [],
    invitedUserIds: row.invited_user_ids ?? [],
    invitedSectorIds: row.invited_sector_ids ?? [],
    visibility: row.visibility as CalendarEvent["visibility"],
    color: row.color ?? undefined,
    category: row.category ?? undefined,
    tags: row.tags ?? [],
    recurrence: row.recurrence ?? undefined,
    reminders: row.reminders ?? [],
    attachments: row.attachments ?? [],
    confirmations: (row.confirmations ?? {}) as CalendarEvent["confirmations"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
    deletedById: row.deleted_by_id ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelledById: row.cancelled_by_id ?? undefined,
  }
}

export async function canAccessActivity(user: SessionUser, activityId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("activities")
    .select(
      "sector, creator_id, participant_ids, invited_user_ids, invited_sector_ids, visibility"
    )
    .eq("id", activityId)
    .single()
  if (!data) return false
  return canViewEvent(user, {
    sector: data.sector,
    creatorId: data.creator_id,
    participantIds: data.participant_ids ?? [],
    invitedUserIds: data.invited_user_ids ?? [],
    invitedSectorIds: data.invited_sector_ids ?? [],
    visibility: data.visibility,
  })
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const TASK_SELECT = `
  id, number, title, description, sector, creator_id, assignee_id, watcher_ids, activity_id,
  start_date, due_date, due_time, status, priority, is_priority, category, tags, recurrence,
  attachments, comment_count, created_at, updated_at, archived_at, archived_by_id, deleted_at, deleted_by_id
`

interface TaskRow {
  id: string
  number: number
  title: string
  description: string
  sector: string
  creator_id: string
  assignee_id: string
  watcher_ids: string[]
  activity_id: string
  start_date: string | null
  due_date: string | null
  due_time: string | null
  status: string
  priority: string
  is_priority: boolean
  category: string | null
  tags: string[]
  recurrence: RecurrenceRule | null
  attachments: ActivityAttachment[]
  comment_count: number
  created_at: string
  updated_at: string
  archived_at: string | null
  archived_by_id: string | null
  deleted_at: string | null
  deleted_by_id: string | null
}

export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    number: taskNumber(row.number),
    title: row.title,
    description: row.description,
    sector: row.sector,
    creatorId: row.creator_id,
    assigneeId: row.assignee_id,
    watcherIds: row.watcher_ids ?? [],
    eventId: row.activity_id,
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    dueTime: row.due_time ?? undefined,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    isPriority: row.is_priority,
    category: row.category ?? undefined,
    tags: row.tags ?? [],
    recurrence: row.recurrence ?? undefined,
    attachments: row.attachments ?? [],
    commentCount: row.comment_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    archivedById: row.archived_by_id ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deletedById: row.deleted_by_id ?? undefined,
  }
}

export async function canAccessTask(user: SessionUser, taskId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("activity_tasks")
    .select("sector, creator_id, assignee_id, watcher_ids")
    .eq("id", taskId)
    .single()
  if (!data) return false
  return canViewTask(user, {
    sector: data.sector,
    creatorId: data.creator_id,
    assigneeId: data.assignee_id,
    watcherIds: data.watcher_ids ?? [],
  })
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export const COMMENT_SELECT = `
  id, task_id, author_id, text, created_at, edited_at, deleted_at, deleted_by_id,
  parent_id, mentioned_user_ids, attachments
`

interface CommentRow {
  id: string
  task_id: string
  author_id: string
  text: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  deleted_by_id: string | null
  parent_id: string | null
  mentioned_user_ids: string[]
  attachments: ActivityAttachment[]
}

export function mapCommentRow(row: CommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    text: row.deleted_at ? "" : row.text,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deletedById: row.deleted_by_id ?? undefined,
    parentId: row.parent_id ?? undefined,
    mentionedUserIds: row.mentioned_user_ids ?? [],
    attachments: row.deleted_at ? [] : (row.attachments ?? []),
  }
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export const CHECKLIST_SELECT = `
  id, task_id, text, done, position, created_by_id, created_at, done_at, done_by_id
`

interface ChecklistRow {
  id: string
  task_id: string
  text: string
  done: boolean
  position: number
  created_by_id: string
  created_at: string
  done_at: string | null
  done_by_id: string | null
}

export function mapChecklistRow(row: ChecklistRow): ChecklistItem {
  return {
    id: row.id,
    taskId: row.task_id,
    text: row.text,
    done: row.done,
    position: row.position,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    doneAt: row.done_at ?? undefined,
    doneById: row.done_by_id ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const HISTORY_SELECT = `
  id, entity_type, entity_id, actor_id, action, field, old_value, new_value, created_at,
  actor:profiles!activity_history_actor_id_fkey(name)
`

interface HistoryRow {
  id: string
  entity_type: string
  entity_id: string
  actor_id: string
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
  actor: Embed<{ name: string }>
}

export function mapHistoryRow(row: HistoryRow) {
  const actor = one(row.actor)
  return {
    id: row.id,
    entityType: row.entity_type as "task" | "event",
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: actor?.name ?? "",
    action: row.action as HistoryAction,
    field: row.field ?? undefined,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    createdAt: row.created_at,
  }
}

type AdminClient = ReturnType<typeof createAdminClient>

export async function addHistory(
  admin: AdminClient,
  entry: {
    entityType: "task" | "event"
    entityId: string
    actorId: string
    action: HistoryAction
    field?: string
    oldValue?: string
    newValue?: string
  }
) {
  await admin.from("activity_history").insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    actor_id: entry.actorId,
    action: entry.action,
    field: entry.field,
    old_value: entry.oldValue,
    new_value: entry.newValue,
  })
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NOTIFICATION_SELECT = `
  id, type, title, message, recipient_user_id, related_type, related_id, read, created_at
`

interface NotificationRow {
  id: string
  type: string
  title: string
  message: string
  recipient_user_id: string
  related_type: string
  related_id: string
  read: boolean
  created_at: string
}

export function mapNotificationRow(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type as ActivityNotificationType,
    title: row.title,
    message: row.message,
    recipientUserId: row.recipient_user_id,
    relatedType: row.related_type as "task" | "event",
    relatedId: row.related_id,
    read: row.read,
    createdAt: row.created_at,
  }
}

export async function notify(
  admin: AdminClient,
  entries: {
    type: ActivityNotificationType
    recipientUserId: string
    relatedType: "task" | "event"
    relatedId: string
    title: string
    message: string
  }[]
) {
  if (entries.length === 0) return
  await admin.from("activity_notifications").insert(
    entries.map((e) => ({
      type: e.type,
      recipient_user_id: e.recipientUserId,
      related_type: e.relatedType,
      related_id: e.relatedId,
      title: e.title,
      message: e.message,
    }))
  )
}
