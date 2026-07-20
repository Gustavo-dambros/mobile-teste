import { NextResponse } from "next/server"
import { z } from "zod"

import { getConversationMembers, mapConversation, requireUser } from "@/lib/chat-interno/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    const { data: memberRows, error: memberError } = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id)
    if (memberError) throw new Error(memberError.message)

    const conversationIds = (memberRows ?? []).map((r) => r.conversation_id)
    if (conversationIds.length === 0) return NextResponse.json({ conversations: [] })

    const { data: rows, error } = await admin
      .from("conversations")
      .select("id, kind, name, description, created_by, created_at")
      .in("id", conversationIds)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)

    const conversations = await Promise.all(
      (rows ?? []).map(async (row) => {
        const members = await getConversationMembers(row.id)
        return mapConversation(row, members, user.id)
      })
    )

    return NextResponse.json({ conversations })
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

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("dm"), memberId: z.string().uuid() }),
  z.object({
    kind: z.literal("group"),
    name: z.string().min(1),
    description: z.string().optional(),
    memberIds: z.array(z.string().uuid()).min(1),
  }),
])

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    if (body.kind === "dm") {
      if (body.memberId === user.id) {
        return NextResponse.json({ error: "Selecione outro colaborador" }, { status: 400 })
      }

      // Dedup: find an existing DM with exactly these two members.
      const { data: myDmIds } = await admin
        .from("conversation_members")
        .select("conversation_id, conversations!inner(kind)")
        .eq("user_id", user.id)
        .eq("conversations.kind", "dm")
      const candidateIds = (myDmIds ?? []).map((r) => r.conversation_id)
      if (candidateIds.length > 0) {
        const { data: existingMember } = await admin
          .from("conversation_members")
          .select("conversation_id")
          .in("conversation_id", candidateIds)
          .eq("user_id", body.memberId)
          .maybeSingle()
        if (existingMember) {
          const { data: row } = await admin
            .from("conversations")
            .select("id, kind, name, description, created_by, created_at")
            .eq("id", existingMember.conversation_id)
            .single()
          if (row) {
            const members = await getConversationMembers(row.id)
            return NextResponse.json({ conversation: mapConversation(row, members, user.id) })
          }
        }
      }

      const { data: conversation, error } = await admin
        .from("conversations")
        .insert({ kind: "dm", created_by: user.id })
        .select("id, kind, name, description, created_by, created_at")
        .single()
      if (error || !conversation) throw new Error(error?.message ?? "Não foi possível iniciar a conversa")

      const { error: membersError } = await admin.from("conversation_members").insert([
        { conversation_id: conversation.id, user_id: user.id, is_admin: false },
        { conversation_id: conversation.id, user_id: body.memberId, is_admin: false },
      ])
      if (membersError) throw new Error(membersError.message)

      const members = await getConversationMembers(conversation.id)
      return NextResponse.json({ conversation: mapConversation(conversation, members, user.id) })
    }

    // group
    const { data: conversation, error } = await admin
      .from("conversations")
      .insert({ kind: "group", name: body.name, description: body.description ?? null, created_by: user.id })
      .select("id, kind, name, description, created_by, created_at")
      .single()
    if (error || !conversation) throw new Error(error?.message ?? "Não foi possível criar o grupo")

    const uniqueMemberIds = [...new Set(body.memberIds)].filter((id) => id !== user.id)
    const { error: membersError } = await admin.from("conversation_members").insert([
      { conversation_id: conversation.id, user_id: user.id, is_admin: true },
      ...uniqueMemberIds.map((id) => ({ conversation_id: conversation.id, user_id: id, is_admin: false })),
    ])
    if (membersError) throw new Error(membersError.message)

    await admin.from("chat_messages").insert({
      conversation_id: conversation.id,
      kind: "system",
      author_id: user.id,
      text: `${user.name} criou o grupo "${body.name}"`,
      system_event: "group_created",
    })

    const members = await getConversationMembers(conversation.id)
    return NextResponse.json({ conversation: mapConversation(conversation, members, user.id) })
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
