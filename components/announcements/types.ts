export type AnnouncementType = "Anúncio" | "Evento"

export type AttachmentKind = "image" | "video" | "document"

export interface AnnouncementAttachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
  mimeType: string
  /**
   * Local preview URL (via URL.createObjectURL on the real File picked from
   * disk). Once a backend exists, this becomes the storage URL returned by
   * the upload endpoint — see lib/announcements/upload.ts.
   */
  url: string
}

export type RecipientMode = "all" | "sectors" | "people"

export interface RecipientSelection {
  mode: RecipientMode
  sectorIds: string[]
  userIds: string[]
}

export interface AnnouncementHistoryEvent {
  id: string
  announcementId: string
  actorName: string
  createdAt: string
  description: string
}

export interface Announcement {
  id: string
  number: string
  type: AnnouncementType
  title: string
  description: string
  /** ISO date, "YYYY-MM-DD" */
  date: string
  /** "HH:mm" */
  time: string
  responsibleId: string
  responsibleName: string
  creatorId: string
  creatorName: string
  attachments: AnnouncementAttachment[]
  recipients: RecipientSelection
  /** Resolved snapshot of who should receive this — recomputed on every edit. */
  recipientUserIds: string[]
  deleted?: boolean
  createdAt: string
  updatedAt: string
}

export type NotificationKind =
  | "published"
  | "reminder-1d"
  | "reminder-day-of"
  | "updated"

export interface AnnouncementNotification {
  id: string
  announcementId: string
  recipientUserId: string
  kind: NotificationKind
  createdAt: string
  read: boolean
}

export interface CreateAnnouncementInput {
  type: AnnouncementType
  title: string
  description: string
  date: string
  time: string
  responsibleId: string
  attachments: AnnouncementAttachment[]
  recipients: RecipientSelection
}

export type UpdateAnnouncementInput = CreateAnnouncementInput
