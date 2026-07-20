import { NextResponse } from "next/server"

import type { AttachmentKind } from "@/components/atividades-setor/types"
import { requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

// This URL is generated once here and stored permanently on the task's
// attachments — never regenerated on read. A 30-day TTL meant every
// attachment silently turned into a broken link a month after upload, even
// though the file was still in Storage. Long-lived instead of switching to
// on-read regeneration (a bigger change across every attachment consumer).
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10 // 10 years
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

function kindFromMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  return "document"
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120)
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const formData = await request.formData()
    const files = formData.getAll("files").filter((f): f is File => f instanceof File)
    const ids = formData.getAll("ids").map(String)

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const admin = createAdminClient()
    const attachments = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `O arquivo "${file.name}" excede o limite de 25MB` },
          { status: 400 }
        )
      }

      const path = `${user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
      const { error: uploadError } = await admin.storage
        .from("activity-attachments")
        .upload(path, file, { contentType: file.type || "application/octet-stream" })
      if (uploadError) throw new Error(uploadError.message)

      const { data: signed, error: signError } = await admin.storage
        .from("activity-attachments")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      if (signError || !signed) throw new Error(signError?.message ?? "Não foi possível gerar a URL do anexo")

      attachments.push({
        id: ids[i] ?? crypto.randomUUID(),
        name: file.name,
        size: file.size,
        kind: kindFromMime(file.type),
        mimeType: file.type || "application/octet-stream",
        url: signed.signedUrl,
      })
    }

    return NextResponse.json({ attachments })
  } catch (error) {
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível enviar os anexos" },
      { status: 400 }
    )
  }
}
