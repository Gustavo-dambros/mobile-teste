import { NextResponse } from "next/server"
import { z } from "zod"

import {
  MEETING_SELECT,
  ReunioesHostError,
  getFullMeeting,
  logMeetingAdminAction,
  requireHostMeeting,
  requireUser,
} from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ minutes: z.number().int().positive().max(240) })

/** Host pushes the auto-end deadline further out — only meaningful for a meeting that
 * already has one (duration set at creation/start); nothing to extend otherwise. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const meeting = await requireHostMeeting(id, user)

    if (!meeting.ends_at) {
      return NextResponse.json({ error: "Esta reunião não tem um horário de término definido." }, { status: 400 })
    }

    const admin = createAdminClient()
    const newEndsAt = new Date(new Date(meeting.ends_at).getTime() + body.minutes * 60_000).toISOString()
    const { data: updated, error } = await admin
      .from("meetings")
      .update({ ends_at: newEndsAt })
      .eq("id", id)
      .select(MEETING_SELECT)
      .single()
    if (error || !updated) throw new Error(error?.message ?? "Não foi possível adicionar tempo")

    await logMeetingAdminAction({ meetingId: id, actorId: user.id, action: "extend_duration" })

    return NextResponse.json({ meeting: await getFullMeeting(updated) })
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
