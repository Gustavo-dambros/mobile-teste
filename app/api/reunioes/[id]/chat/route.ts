import { NextResponse } from "next/server"
import { z } from "zod"

import { DEFAULT_GUEST_PERMISSIONS, mapChatMessageRow } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z
  .object({
    participantId: z.string().uuid(),
    text: z.string().trim().max(4000).optional().default(""),
    attachmentUrl: z.string().url().optional(),
    attachmentName: z.string().min(1).max(255).optional(),
  })
  .refine((body) => body.text.length > 0 || !!body.attachmentUrl, {
    message: "Mensagem vazia",
    path: ["text"],
  })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: participant, error: participantError } = await admin
      .from("meeting_participants")
      .select("id, name, kind")
      .eq("id", body.participantId)
      .eq("meeting_id", id)
      .is("left_at", null)
      .single()
    if (participantError || !participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })
    }

    // No session on this route (guests have none) — participantId alone identifies the
    // caller, so a link-guest's chat permission (host-configured at creation) has to be
    // re-checked here too, not just trusted from the client's disabled input.
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

    const { data: message, error } = await admin
      .from("meeting_chat_messages")
      .insert({
        meeting_id: id,
        author_participant_id: participant.id,
        author_name: participant.name,
        text: body.text,
        attachment_url: body.attachmentUrl ?? null,
        attachment_name: body.attachmentName ?? null,
      })
      .select("id, author_participant_id, author_name, text, created_at, attachment_url, attachment_name")
      .single()
    if (error || !message) throw new Error(error?.message ?? "Não foi possível enviar a mensagem")

    return NextResponse.json({ message: mapChatMessageRow(message) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
