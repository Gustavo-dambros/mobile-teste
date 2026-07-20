import type { AttachmentKind, ChatAttachment } from "@/lib/chat-interno/types"

export const ACCEPTED_ATTACHMENT_TYPES =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"

function kindFromMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  return "document"
}

/**
 * Turns real File objects picked from disk into attachments with a local
 * object URL for instant preview — same pattern as lib/tickets/upload.ts.
 */
export function filesToAttachments(files: File[]): ChatAttachment[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    kind: kindFromMime(file.type),
    mimeType: file.type,
    url: URL.createObjectURL(file),
  }))
}

/** Wraps a recorded voice message (MediaRecorder Blob) as a ChatAttachment. */
export function blobToAudioAttachment(blob: Blob, durationSeconds: number): ChatAttachment {
  return {
    id: crypto.randomUUID(),
    name: `Mensagem de voz (${Math.round(durationSeconds)}s)`,
    size: blob.size,
    kind: "audio",
    mimeType: blob.type || "audio/webm",
    url: URL.createObjectURL(blob),
    durationSeconds,
  }
}

export function revokeAttachmentUrls(attachments: ChatAttachment[]) {
  attachments.forEach((att) => URL.revokeObjectURL(att.url))
}

/**
 * Uploads local-preview attachments (built by filesToAttachments /
 * blobToAudioAttachment) to Supabase Storage. Each attachment's blob: URL is
 * re-fetched to recover the underlying file data — no need to carry the
 * original File/Blob through component state.
 */
export async function uploadAttachments(attachments: ChatAttachment[]): Promise<ChatAttachment[]> {
  if (attachments.length === 0) return []

  const formData = new FormData()
  for (const att of attachments) {
    const blob = await fetch(att.url).then((r) => r.blob())
    formData.append("files", new File([blob], att.name, { type: att.mimeType }))
    formData.append("ids", att.id)
    formData.append("durations", att.durationSeconds ? String(att.durationSeconds) : "")
  }

  const res = await fetch("/api/chat-interno/attachments", { method: "POST", body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar os anexos")
  return data.attachments as ChatAttachment[]
}
