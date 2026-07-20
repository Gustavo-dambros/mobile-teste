import { NextResponse } from "next/server"

import { DEFAULT_GUEST_PERMISSIONS } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

// This URL is generated once here and stored permanently in the meeting
// chat message — never regenerated on read. A 30-day TTL meant every
// attachment silently turned into a broken link a month after upload, even
// though the file was still in Storage. Long-lived instead of switching to
// on-read regeneration (a bigger change across every attachment consumer).
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10 // 10 years
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120)
}

/** No requireUser() — guests attach files too, same meetingId+participantId
 * credential convention as every other reunioes guest-reachable route. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get("file")
    const participantId = formData.get("participantId")
    if (!(file instanceof File) || typeof participantId !== "string") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "O arquivo excede o limite de 25MB" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: participant } = await admin
      .from("meeting_participants")
      .select("id, kind")
      .eq("id", participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
      .maybeSingle()
    if (!participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }

    if (participant.kind === "guest") {
      const { data: meeting } = await admin.from("meetings").select("guest_permissions").eq("id", id).single()
      const permissions = meeting?.guest_permissions ?? DEFAULT_GUEST_PERMISSIONS
      if (!permissions.chat) {
        return NextResponse.json(
          { error: "O anfitrião desativou o chat para convidados pelo link." },
          { status: 403 }
        )
      }
    }

    const path = `${id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
    const { error: uploadError } = await admin.storage
      .from("meeting-attachments")
      .upload(path, file, { contentType: file.type || "application/octet-stream" })
    if (uploadError) throw new Error(uploadError.message)

    const { data: signed, error: signError } = await admin.storage
      .from("meeting-attachments")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (signError || !signed) throw new Error(signError?.message ?? "Não foi possível gerar a URL do anexo")

    return NextResponse.json({ url: signed.signedUrl, name: file.name })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível enviar o anexo" },
      { status: 400 }
    )
  }
}
