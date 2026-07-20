import type { KanbanAttachment } from "@/components/kanban/types"

export const ACCEPTED_ATTACHMENT_TYPES =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.7z"

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" excede o tamanho máximo permitido de 25 MB`
  }
  if (file.size === 0) {
    return `"${file.name}" está vazio`
  }
  return null
}

/** Uploads files straight to Supabase Storage via the real multipart endpoint — no local blob preview step. */
export async function uploadAttachments(cardId: string, files: File[]): Promise<KanbanAttachment[]> {
  if (files.length === 0) return []

  const formData = new FormData()
  formData.append("cardId", cardId)
  for (const file of files) formData.append("files", file)

  const res = await fetch("/api/kanban/attachments", { method: "POST", body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar os anexos")
  return data.attachments as KanbanAttachment[]
}
