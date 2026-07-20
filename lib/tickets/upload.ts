import type { AttachmentKind, TicketAttachment } from "@/components/tickets/types"

export const ACCEPTED_ATTACHMENT_TYPES =
  "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"

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
export function filesToAttachments(files: File[]): TicketAttachment[] {
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
 * Uploads local-preview attachments (built by filesToAttachments) to
 * Supabase Storage. Each attachment's blob: URL is re-fetched to recover the
 * underlying File data — no need to carry the original File objects through
 * component state, the preview URL already references them in memory.
 */
export async function uploadAttachments(
  attachments: TicketAttachment[]
): Promise<TicketAttachment[]> {
  if (attachments.length === 0) return []

  const formData = new FormData()
  for (const att of attachments) {
    const blob = await fetch(att.url).then((r) => r.blob())
    formData.append("files", new File([blob], att.name, { type: att.mimeType }))
    formData.append("ids", att.id)
  }

  const res = await fetch("/api/tickets/attachments", { method: "POST", body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar os anexos")
  return data.attachments as TicketAttachment[]
}

export function revokeAttachmentUrls(attachments: TicketAttachment[]) {
  attachments.forEach((att) => URL.revokeObjectURL(att.url))
}
