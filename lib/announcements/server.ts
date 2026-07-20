import "server-only"

import type { SessionUser } from "@/lib/session"
import { getCurrentUser } from "@/lib/session-server"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementHistoryEvent,
  AnnouncementNotification,
  NotificationKind,
  RecipientSelection,
} from "@/components/announcements/types"

export class AnnouncementsAuthError extends Error {
  constructor(message = "Não autenticado") {
    super(message)
    this.name = "AnnouncementsAuthError"
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new AnnouncementsAuthError()
  return user
}

type Embed<T> = T | T[] | null
function one<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function announcementNumber(n: number) {
  return `AE-${String(n).padStart(4, "0")}`
}

export const ANNOUNCEMENT_SELECT = `
  id, number, type, title, description, event_date, event_time,
  responsible_id, creator_id, attachments, recipient_mode, recipient_sector_ids,
  recipient_people_ids, recipient_user_ids, deleted, created_at, updated_at,
  responsible:profiles!announcements_responsible_id_fkey(name),
  creator:profiles!announcements_creator_id_fkey(name)
`

interface AnnouncementRow {
  id: string
  number: number
  type: string
  title: string
  description: string
  event_date: string
  event_time: string
  responsible_id: string
  creator_id: string
  attachments: AnnouncementAttachment[] | null
  recipient_mode: string
  recipient_sector_ids: string[] | null
  recipient_people_ids: string[] | null
  recipient_user_ids: string[] | null
  deleted: boolean
  created_at: string
  updated_at: string
  responsible: Embed<{ name: string }>
  creator: Embed<{ name: string }>
}

export function mapAnnouncementRow(row: AnnouncementRow): Announcement {
  const responsible = one(row.responsible)
  const creator = one(row.creator)
  const recipients: RecipientSelection = {
    mode: row.recipient_mode as RecipientSelection["mode"],
    sectorIds: row.recipient_sector_ids ?? [],
    userIds: row.recipient_people_ids ?? [],
  }
  return {
    id: row.id,
    number: announcementNumber(row.number),
    type: row.type as Announcement["type"],
    title: row.title,
    description: row.description,
    date: row.event_date,
    time: row.event_time,
    responsibleId: row.responsible_id,
    responsibleName: responsible?.name ?? "",
    creatorId: row.creator_id,
    creatorName: creator?.name ?? "",
    attachments: row.attachments ?? [],
    recipients,
    recipientUserIds: row.recipient_user_ids ?? [],
    deleted: row.deleted || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface NotificationRow {
  id: string
  announcement_id: string
  recipient_user_id: string
  kind: string
  read: boolean
  created_at: string
}

export function mapNotificationRow(row: NotificationRow): AnnouncementNotification {
  return {
    id: row.id,
    announcementId: row.announcement_id,
    recipientUserId: row.recipient_user_id,
    kind: row.kind as NotificationKind,
    createdAt: row.created_at,
    read: row.read,
  }
}

interface HistoryRow {
  id: string
  announcement_id: string
  description: string
  created_at: string
  actor: Embed<{ name: string }>
}

export const HISTORY_SELECT = `
  id, announcement_id, description, created_at,
  actor:profiles!announcement_history_actor_id_fkey(name)
`

export function mapHistoryRow(row: HistoryRow): AnnouncementHistoryEvent {
  const actor = one(row.actor)
  return {
    id: row.id,
    announcementId: row.announcement_id,
    actorName: actor?.name ?? "",
    createdAt: row.created_at,
    description: row.description,
  }
}

/** Resolves a recipient selection against real, active profiles. */
export async function resolveRecipientUserIds(selection: RecipientSelection): Promise<string[]> {
  const admin = createAdminClient()
  if (selection.mode === "all") {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => r.id)
  }
  if (selection.mode === "sectors") {
    if (selection.sectorIds.length === 0) return []
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .in("sector", selection.sectorIds)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => r.id)
  }
  return [...selection.userIds]
}
