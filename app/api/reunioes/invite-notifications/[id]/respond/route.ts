import { NextResponse } from "next/server"
import { z } from "zod"

import { requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ status: z.enum(["accepted", "declined"]) })

/** Accept/decline a meeting invite — updates meeting_invitees.status (visible to the
 * organizer in ParticipantsPanel) and marks the notification read. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { status } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: notification, error: fetchError } = await admin
      .from("meeting_invite_notifications")
      .select("id, meeting_id, recipient_user_id")
      .eq("id", id)
      .maybeSingle()
    if (fetchError) throw new Error(fetchError.message)
    if (!notification || notification.recipient_user_id !== user.id) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
    }

    const { error: inviteeError } = await admin
      .from("meeting_invitees")
      .update({ status })
      .eq("meeting_id", notification.meeting_id)
      .eq("user_id", user.id)
    if (inviteeError) throw new Error(inviteeError.message)

    const { error: readError } = await admin
      .from("meeting_invite_notifications")
      .update({ read: true })
      .eq("id", id)
    if (readError) throw new Error(readError.message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "ReunioesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
