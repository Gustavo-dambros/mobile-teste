import { NextResponse } from "next/server"

import { requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Marks a single invite notification read without changing the invitee's accept/decline
 * status — used by "Ver detalhes" (they saw it, but haven't necessarily responded). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    const { error } = await admin
      .from("meeting_invite_notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("recipient_user_id", user.id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === "ReunioesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
