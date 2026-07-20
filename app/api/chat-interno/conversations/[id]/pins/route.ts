import { NextResponse } from "next/server"
import { z } from "zod"

import { PINNED_SELECT, isActiveMember, mapPinnedRow, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    if (!(await isActiveMember(user.id, id))) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("chat_pinned_messages")
      .select(PINNED_SELECT)
      .eq("conversation_id", id)
      .order("pinned_at", { ascending: false })
    if (error) throw new Error(error.message)

    const pins = (data ?? []).map((row) => mapPinnedRow(row, user.id))
    return NextResponse.json({ pins })
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

const bodySchema = z.object({ messageId: z.string().uuid() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { messageId } = bodySchema.parse(await request.json())

    if (!(await isActiveMember(user.id, id))) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const admin = createAdminClient()

    const { data: message } = await admin
      .from("chat_messages")
      .select("id")
      .eq("id", messageId)
      .eq("conversation_id", id)
      .maybeSingle()
    if (!message) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    const { error } = await admin
      .from("chat_pinned_messages")
      .upsert(
        { conversation_id: id, message_id: messageId, pinned_by_id: user.id },
        { onConflict: "conversation_id,message_id", ignoreDuplicates: true }
      )
    if (error) throw new Error(error.message)

    const { data, error: listError } = await admin
      .from("chat_pinned_messages")
      .select(PINNED_SELECT)
      .eq("conversation_id", id)
      .order("pinned_at", { ascending: false })
    if (listError) throw new Error(listError.message)

    const pins = (data ?? []).map((row) => mapPinnedRow(row, user.id))
    return NextResponse.json({ pins })
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
