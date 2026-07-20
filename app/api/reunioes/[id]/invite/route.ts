import { NextResponse } from "next/server"
import { z } from "zod"

import { ReunioesHostError, getFullMeeting, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ userIds: z.array(z.string().uuid()).min(1) })

/** Host adds people to an already-running (or not-yet-started) meeting — inserts
 * meeting_invitees rows plus one meeting_invite_notifications row per new invitee,
 * so their sidebar badge / central invite card (see components/reunioes/MeetingInviteModal.tsx)
 * pick it up on the next poll. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const meeting = await requireHostMeeting(id, user)
    const { userIds } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const [{ data: existingInvitees }, { data: existingParticipants }] = await Promise.all([
      admin.from("meeting_invitees").select("user_id").eq("meeting_id", id),
      admin.from("meeting_participants").select("user_id").eq("meeting_id", id).not("user_id", "is", null),
    ])
    const alreadyKnown = new Set([
      ...(existingInvitees ?? []).map((r) => r.user_id),
      ...(existingParticipants ?? []).map((r) => r.user_id as string),
    ])
    const newIds = [...new Set(userIds)].filter((uid) => uid !== user.id && !alreadyKnown.has(uid))

    if (newIds.length > 0) {
      const { error: inviteError } = await admin
        .from("meeting_invitees")
        .insert(newIds.map((userId) => ({ meeting_id: id, user_id: userId })))
      if (inviteError) throw new Error(inviteError.message)

      const { error: notifyError } = await admin
        .from("meeting_invite_notifications")
        .insert(newIds.map((userId) => ({ meeting_id: id, recipient_user_id: userId })))
      if (notifyError) throw new Error(notifyError.message)
    }

    return NextResponse.json({ meeting: await getFullMeeting(meeting) })
  } catch (error) {
    if (error instanceof ReunioesHostError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Selecione ao menos um colaborador" }, { status: 400 })
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
