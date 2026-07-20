import type { AnnouncementAttachment, AttachmentKind } from "@/components/announcements/types"

export const ACCEPTED_PHOTO_TYPES = "image/*"
export const ACCEPTED_VIDEO_TYPES = "video/*"
export const ACCEPTED_DOCUMENT_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"

function kindFromMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  return "document"
}

/**
 * Turns real File objects picked from disk into attachments with a local
 * object URL for instant preview. No base64, no manual URLs — the File
 * blob stays in memory and is referenced directly.
 */
export function filesToAttachments(files: File[]): AnnouncementAttachment[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    kind: kindFromMime(file.type),
    mimeType: file.type,
    url: URL.createObjectURL(file),
  }))
}

/**
 * Uploads real File objects to Supabase Storage via the attachments route,
 * keeping the client-generated ids so callers can reconcile against the
 * local-preview list built by filesToAttachments().
 */
export async function uploadAttachments(
  files: File[],
  ids: string[]
): Promise<AnnouncementAttachment[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))
  ids.forEach((id) => formData.append("ids", id))
  const res = await fetch("/api/announcements/attachments", { method: "POST", body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar os anexos")
  return data.attachments as AnnouncementAttachment[]
}

export function revokeAttachmentUrls(attachments: AnnouncementAttachment[]) {
  attachments.forEach((att) => URL.revokeObjectURL(att.url))
}
