import { NextResponse } from "next/server"

import {
  ATTACHMENT_SELECT,
  getCardOwner,
  logCardActivity,
  mapAttachmentRow,
  requireUser,
} from "@/lib/kanban/server"
import { createAdminClient } from "@/lib/supabase/admin"

// This URL is generated once here and stored permanently on the card's
// attachments — never regenerated on read. A 30-day TTL meant every
// attachment silently turned into a broken link a month after upload, even
// though the file was still in Storage. Long-lived instead of switching to
// on-read regeneration (a bigger change across every attachment consumer).
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10 // 10 years
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const BUCKET = "kanban-attachments"

function kindFromMime(mime: string, name: string): string {
  const lower = name.toLowerCase()
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf"
  if (mime.includes("spreadsheet") || lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv")) {
    return "spreadsheet"
  }
  if (lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".7z")) return "archive"
  if (
    mime.startsWith("application/") ||
    lower.endsWith(".doc") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".ppt") ||
    lower.endsWith(".pptx") ||
    lower.endsWith(".txt")
  ) {
    return "document"
  }
  return "other"
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120)
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const formData = await request.formData()
    const cardId = String(formData.get("cardId") ?? "")
    const files = formData.getAll("files").filter((f): f is File => f instanceof File)

    if (!cardId || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const owner = await getCardOwner(cardId)
    if (!owner || owner.ownerId !== user.id) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const attachments = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `O arquivo "${file.name}" excede o limite de 25MB` }, { status: 400 })
      }

      const path = `${user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" })
      if (uploadError) throw new Error(uploadError.message)

      const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      if (signError || !signed) throw new Error(signError?.message ?? "Não foi possível gerar a URL do anexo")

      const { data: row, error } = await admin
        .from("kanban_card_attachments")
        .insert({
          card_id: cardId,
          user_id: user.id,
          filename: path,
          original_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size,
          kind: kindFromMime(file.type, file.name),
          storage_url: signed.signedUrl,
        })
        .select(ATTACHMENT_SELECT)
        .single()
      if (error || !row) throw new Error(error?.message ?? "Não foi possível salvar o anexo")

      attachments.push(mapAttachmentRow(row))
    }

    await logCardActivity(admin, {
      cardId,
      userId: user.id,
      action: "attachment_added",
      newValue: attachments.map((a) => a.originalName).join(", "),
    })

    return NextResponse.json({ attachments })
  } catch (error) {
    if (error instanceof Error && error.name === "KanbanAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível enviar os anexos" },
      { status: 400 }
    )
  }
}
