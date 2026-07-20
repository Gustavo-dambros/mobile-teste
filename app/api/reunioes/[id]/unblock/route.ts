import { NextResponse } from "next/server"
import { z } from "zod"

import { ReunioesHostError, logMeetingAdminAction, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z
  .object({ userId: z.string().uuid().optional(), email: z.string().email().optional() })
  .refine((b) => !!b.userId || !!b.email, { message: "Informe userId ou email" })

/** Explicit re-invite of a previously removed participant — the only way past the
 * permanent block enforced server-side in join / livekit-token / invite-request. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    await requireHostMeeting(id, user)
    const { userId, email } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    let query = admin
      .from("meeting_blocked_participants")
      .update({ unblocked_at: new Date().toISOString() })
      .eq("meeting_id", id)
      .is("unblocked_at", null)
    query = userId ? query.eq("user_id", userId) : query.eq("email", email!)
    const { error } = await query
    if (error) throw new Error(error.message)

    if (userId) {
      await admin.from("meeting_invitees").upsert(
        { meeting_id: id, user_id: userId, status: "pending" },
        { onConflict: "meeting_id,user_id" }
      )
      await admin
        .from("meeting_invite_notifications")
        .upsert({ meeting_id: id, recipient_user_id: userId, read: false }, { onConflict: "meeting_id,recipient_user_id" })
    }

    await logMeetingAdminAction({
      meetingId: id,
      actorId: user.id,
      action: "unblock_participant",
      targetLabel: userId ?? email,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ReunioesHostError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
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
