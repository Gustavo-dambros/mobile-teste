import { NextResponse } from "next/server"
import { z } from "zod"

import { ReunioesHostError, logMeetingAdminAction, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ locked: z.boolean() })

/** While locked, no new guest requests or first-time registered joins are accepted —
 * anyone already inside (participants) is unaffected. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { locked } = bodySchema.parse(await request.json())
    await requireHostMeeting(id, user)

    const admin = createAdminClient()
    const { error } = await admin.from("meetings").update({ locked }).eq("id", id)
    if (error) throw new Error(error.message)

    await logMeetingAdminAction({
      meetingId: id,
      actorId: user.id,
      action: locked ? "lock_meeting" : "unlock_meeting",
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
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
