import { NextResponse } from "next/server"

import { ReunioesHostError, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Host-only list of who's currently blocked from this meeting — the "Bloqueados" section
 * in ParticipantsPanel, so a removal can be explicitly reversed (see /unblock). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    await requireHostMeeting(id, user)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("meeting_blocked_participants")
      .select("id, user_id, email, blocked_at, profile:profiles!meeting_blocked_participants_user_id_fkey(name)")
      .eq("meeting_id", id)
      .is("unblocked_at", null)
      .order("blocked_at", { ascending: false })
    if (error) throw new Error(error.message)

    return NextResponse.json({
      blocked: (data ?? []).map((row) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
        return {
          id: row.id,
          userId: row.user_id,
          email: row.email,
          name: profile?.name ?? row.email ?? "Participante",
          blockedAt: row.blocked_at,
        }
      }),
    })
  } catch (error) {
    if (error instanceof ReunioesHostError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
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
