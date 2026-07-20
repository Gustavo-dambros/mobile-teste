import { NextResponse } from "next/server"
import { z } from "zod"

import {
  MESSAGE_SELECT,
  applySeenStatus,
  isActiveMember,
  mapMessageRow,
  requireUser,
} from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_MESSAGES = 300

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!(await isActiveMember(user.id, id))) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const [{ data, error }, { data: readStates }, { data: pinnedRows }] = await Promise.all([
      admin
        .from("chat_messages")
        .select(MESSAGE_SELECT)
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(MAX_MESSAGES),
      admin.from("chat_read_state").select("user_id, last_seen_at").eq("conversation_id", id),
      admin.from("chat_pinned_messages").select("message_id").eq("conversation_id", id),
    ])
    if (error) throw new Error(error.message)

    const messages = applySeenStatus(
      (data ?? []).reverse().map((m) => mapMessageRow(m, user.id)),
      readStates ?? [],
      user.id
    )

    return NextResponse.json({ messages, pinnedMessageIds: (pinnedRows ?? []).map((p) => p.message_id) })
  } catch (error) {
    if (error instanceof Error && error.name === "ChatAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  kind: z.enum(["image", "video", "document", "audio"]),
  mimeType: z.string(),
  url: z.string(),
  durationSeconds: z.number().optional(),
})

const bodySchema = z
  .object({
    text: z.string().default(""),
    replyToId: z.string().uuid().optional(),
    attachments: z.array(attachmentSchema).default([]),
  })
  .refine((data) => data.text.trim().length > 0 || data.attachments.length > 0, {
    message: "Envie um texto ou pelo menos um anexo",
  })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())

    if (!(await isActiveMember(user.id, id))) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: message, error } = await admin
      .from("chat_messages")
      .insert({
        conversation_id: id,
        kind: "message",
        author_id: user.id,
        text: body.text,
        reply_to_id: body.replyToId ?? null,
        attachments: body.attachments,
      })
      .select(MESSAGE_SELECT)
      .single()
    if (error || !message) throw new Error(error?.message ?? "Não foi possível enviar a mensagem")

    return NextResponse.json({ message: mapMessageRow(message, user.id) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "ChatAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
