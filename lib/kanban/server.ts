import "server-only"

import type { SessionUser } from "@/lib/session"
import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  KanbanActivityAction,
  KanbanActivityLogEntry,
  KanbanAttachment,
  KanbanBoard,
  KanbanCard,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanColumn,
  KanbanComment,
  KanbanLabel,
} from "@/components/kanban/types"

export class KanbanAuthError extends Error {
  constructor(message = "Não autenticado") {
    super(message)
    this.name = "KanbanAuthError"
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new KanbanAuthError()
  return user
}

// Supabase's untyped query builder infers to-one embedded relations as
// arrays since it can't see the FK's uniqueness — normalize either shape.
type Embed<T> = T | T[] | null
function one<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const BOARD_SELECT = `
  id, user_id, title, description, background_type, background_value,
  is_default, position, archived_at, created_at, updated_at
`

interface BoardRow {
  id: string
  user_id: string
  title: string
  description: string | null
  background_type: string
  background_value: string
  is_default: boolean
  position: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export function mapBoardRow(row: BoardRow): KanbanBoard {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    backgroundType: row.background_type as KanbanBoard["backgroundType"],
    backgroundValue: row.background_value,
    isDefault: row.is_default,
    position: row.position,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const COLUMN_SELECT = `
  id, board_id, title, position, color, is_done_column, archived_at, created_at, updated_at
`

interface ColumnRow {
  id: string
  board_id: string
  title: string
  position: number
  color: string | null
  is_done_column: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export function mapColumnRow(row: ColumnRow): KanbanColumn {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
    color: row.color ?? undefined,
    isDoneColumn: row.is_done_column,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const CARD_SELECT = `
  id, board_id, column_id, user_id, title, description, position, priority,
  start_at, due_at, completed_at, reminder_type, reminder_custom_minutes,
  recurrence_type, recurrence_custom_days, cover_type, cover_value, label_ids,
  archived_at, created_at, updated_at
`

interface CardRow {
  id: string
  board_id: string
  column_id: string
  user_id: string
  title: string
  description: string | null
  position: number
  priority: string
  start_at: string | null
  due_at: string | null
  completed_at: string | null
  reminder_type: string | null
  reminder_custom_minutes: number | null
  recurrence_type: string | null
  recurrence_custom_days: number | null
  cover_type: string
  cover_value: string | null
  label_ids: string[] | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export function mapCardRow(row: CardRow): KanbanCard {
  return {
    id: row.id,
    boardId: row.board_id,
    columnId: row.column_id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    position: row.position,
    priority: row.priority as KanbanCard["priority"],
    startAt: row.start_at ?? undefined,
    dueAt: row.due_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    reminderType: (row.reminder_type as KanbanCard["reminderType"]) ?? undefined,
    reminderCustomMinutes: row.reminder_custom_minutes ?? undefined,
    recurrenceType: (row.recurrence_type as KanbanCard["recurrenceType"]) ?? undefined,
    recurrenceCustomDays: row.recurrence_custom_days ?? undefined,
    coverType: row.cover_type as KanbanCard["coverType"],
    coverValue: row.cover_value ?? undefined,
    labelIds: row.label_ids ?? [],
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const LABEL_SELECT = `id, user_id, name, color, created_at, updated_at`

interface LabelRow {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export function mapLabelRow(row: LabelRow): KanbanLabel {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getBoardOwnerId(boardId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from("kanban_boards").select("user_id").eq("id", boardId).maybeSingle()
  return data?.user_id ?? null
}

interface ColumnBoardRow {
  board_id: string
  board: Embed<{ user_id: string }>
}

export async function getColumnOwner(
  columnId: string
): Promise<{ boardId: string; ownerId: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("kanban_columns")
    .select("board_id, board:kanban_boards(user_id)")
    .eq("id", columnId)
    .maybeSingle<ColumnBoardRow>()
  if (!data) return null
  const board = one(data.board)
  if (!board) return null
  return { boardId: data.board_id, ownerId: board.user_id }
}

export async function getCardOwner(
  cardId: string
): Promise<{ boardId: string; columnId: string; ownerId: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("kanban_cards")
    .select("board_id, column_id, user_id")
    .eq("id", cardId)
    .maybeSingle()
  if (!data) return null
  return { boardId: data.board_id, columnId: data.column_id, ownerId: data.user_id }
}

export async function getChecklistOwner(
  checklistId: string
): Promise<{ cardId: string; ownerId: string } | null> {
  const admin = createAdminClient()
  interface ChecklistCardRow {
    card_id: string
    card: Embed<{ user_id: string }>
  }
  const { data } = await admin
    .from("kanban_card_checklists")
    .select("card_id, card:kanban_cards(user_id)")
    .eq("id", checklistId)
    .maybeSingle<ChecklistCardRow>()
  if (!data) return null
  const card = one(data.card)
  if (!card) return null
  return { cardId: data.card_id, ownerId: card.user_id }
}

export async function getChecklistItemOwner(
  itemId: string
): Promise<{ checklistId: string; cardId: string; ownerId: string } | null> {
  const admin = createAdminClient()
  interface ItemChecklistCardRow {
    checklist_id: string
    checklist: Embed<{ card_id: string; card: Embed<{ user_id: string }> }>
  }
  const { data } = await admin
    .from("kanban_card_checklist_items")
    .select("checklist_id, checklist:kanban_card_checklists(card_id, card:kanban_cards(user_id))")
    .eq("id", itemId)
    .maybeSingle<ItemChecklistCardRow>()
  if (!data) return null
  const checklist = one(data.checklist)
  if (!checklist) return null
  const card = one(checklist.card)
  if (!card) return null
  return { checklistId: data.checklist_id, cardId: checklist.card_id, ownerId: card.user_id }
}

// ---------------------------------------------------------------------------
// Checklists
// ---------------------------------------------------------------------------

export const CHECKLIST_SELECT = `id, card_id, title, position, created_at, updated_at`

interface ChecklistRow {
  id: string
  card_id: string
  title: string
  position: number
  created_at: string
  updated_at: string
}

export function mapChecklistRow(row: ChecklistRow): KanbanChecklist {
  return {
    id: row.id,
    cardId: row.card_id,
    title: row.title,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const CHECKLIST_ITEM_SELECT = `
  id, checklist_id, title, is_completed, position, completed_at, created_at, updated_at
`

interface ChecklistItemRow {
  id: string
  checklist_id: string
  title: string
  is_completed: boolean
  position: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

export function mapChecklistItemRow(row: ChecklistItemRow): KanbanChecklistItem {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    title: row.title,
    isCompleted: row.is_completed,
    position: row.position,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export const COMMENT_SELECT = `id, card_id, user_id, content, edited_at, deleted_at, created_at, updated_at`

interface CommentRow {
  id: string
  card_id: string
  user_id: string
  content: string
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export function mapCommentRow(row: CommentRow): KanbanComment {
  return {
    id: row.id,
    cardId: row.card_id,
    userId: row.user_id,
    content: row.deleted_at ? "" : row.content,
    editedAt: row.edited_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getCommentOwner(
  commentId: string
): Promise<{ cardId: string; authorId: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("kanban_card_comments")
    .select("card_id, user_id")
    .eq("id", commentId)
    .maybeSingle()
  if (!data) return null
  return { cardId: data.card_id, authorId: data.user_id }
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export const ATTACHMENT_SELECT = `
  id, card_id, comment_id, user_id, filename, original_name, mime_type, size, kind,
  storage_url, is_cover, created_at
`

interface AttachmentRow {
  id: string
  card_id: string | null
  comment_id: string | null
  user_id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  kind: string
  storage_url: string
  is_cover: boolean
  created_at: string
}

export function mapAttachmentRow(row: AttachmentRow): KanbanAttachment {
  return {
    id: row.id,
    cardId: row.card_id ?? undefined,
    commentId: row.comment_id ?? undefined,
    userId: row.user_id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    kind: row.kind as KanbanAttachment["kind"],
    storageUrl: row.storage_url,
    isCover: row.is_cover,
    createdAt: row.created_at,
  }
}

export async function getAttachmentOwner(
  attachmentId: string
): Promise<{ cardId: string | null; filename: string; ownerId: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("kanban_card_attachments")
    .select("card_id, filename, user_id")
    .eq("id", attachmentId)
    .maybeSingle()
  if (!data) return null
  return { cardId: data.card_id, filename: data.filename, ownerId: data.user_id }
}

export const KANBAN_ATTACHMENTS_BUCKET = "kanban-attachments"

/**
 * Deleting a card/column/board cascade-deletes its `kanban_card_attachments`
 * rows in the DB, but that never removes the underlying files from Storage —
 * call this with the affected card ids BEFORE the cascade-triggering delete
 * so the files can still be looked up.
 */
export async function removeAttachmentFilesForCards(
  admin: ReturnType<typeof createAdminClient>,
  cardIds: string[]
) {
  if (cardIds.length === 0) return
  const { data } = await admin.from("kanban_card_attachments").select("filename").in("card_id", cardIds)
  const filenames = (data ?? []).map((a) => a.filename)
  if (filenames.length === 0) return
  await admin.storage.from(KANBAN_ATTACHMENTS_BUCKET).remove(filenames)
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export const ACTIVITY_SELECT = `id, card_id, user_id, action, field, old_value, new_value, created_at`

interface ActivityRow {
  id: string
  card_id: string
  user_id: string
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}

export function mapActivityRow(row: ActivityRow): KanbanActivityLogEntry {
  return {
    id: row.id,
    cardId: row.card_id,
    userId: row.user_id,
    action: row.action as KanbanActivityAction,
    field: row.field ?? undefined,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    createdAt: row.created_at,
  }
}

type AdminClient = ReturnType<typeof createAdminClient>

export interface CardStats {
  checklistTotal: number
  checklistCompleted: number
  commentCount: number
  attachmentCount: number
}

/**
 * Bulk per-card counts for the board face (checklist progress bar, comment/
 * attachment badges) — computed once per board load instead of lazily
 * per-card, since every card on the board renders these without the user
 * ever opening it.
 */
export async function getCardStats(admin: AdminClient, cardIds: string[]): Promise<Record<string, CardStats>> {
  const stats: Record<string, CardStats> = {}
  if (cardIds.length === 0) return stats

  const ensure = (cardId: string) => {
    if (!stats[cardId]) stats[cardId] = { checklistTotal: 0, checklistCompleted: 0, commentCount: 0, attachmentCount: 0 }
    return stats[cardId]
  }

  const { data: checklists } = await admin
    .from("kanban_card_checklists")
    .select("id, card_id")
    .in("card_id", cardIds)
  const checklistCardById = new Map((checklists ?? []).map((c) => [c.id as string, c.card_id as string]))
  const checklistIds = [...checklistCardById.keys()]

  if (checklistIds.length > 0) {
    const { data: items } = await admin
      .from("kanban_card_checklist_items")
      .select("checklist_id, is_completed")
      .in("checklist_id", checklistIds)
    for (const item of items ?? []) {
      const cardId = checklistCardById.get(item.checklist_id as string)
      if (!cardId) continue
      const entry = ensure(cardId)
      entry.checklistTotal += 1
      if (item.is_completed) entry.checklistCompleted += 1
    }
  }

  const { data: comments } = await admin
    .from("kanban_card_comments")
    .select("card_id")
    .in("card_id", cardIds)
    .is("deleted_at", null)
  for (const comment of comments ?? []) {
    ensure(comment.card_id as string).commentCount += 1
  }

  const { data: attachments } = await admin
    .from("kanban_card_attachments")
    .select("card_id")
    .in("card_id", cardIds)
  for (const attachment of attachments ?? []) {
    if (!attachment.card_id) continue
    ensure(attachment.card_id as string).attachmentCount += 1
  }

  return stats
}

export async function logCardActivity(
  admin: AdminClient,
  entry: {
    cardId: string
    userId: string
    action: KanbanActivityAction
    field?: string
    oldValue?: string
    newValue?: string
  }
) {
  await admin.from("kanban_card_activity").insert({
    card_id: entry.cardId,
    user_id: entry.userId,
    action: entry.action,
    field: entry.field,
    old_value: entry.oldValue,
    new_value: entry.newValue,
  })
}
