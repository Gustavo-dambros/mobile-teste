import { NextResponse } from "next/server"
import { z } from "zod"

import { ReunioesHostError, getFullMeeting, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ guestId: z.string().uuid() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { guestId } = bodySchema.parse(await request.json())
    const meeting = await requireHostMeeting(id, user)
    const admin = createAdminClient()

    const { data: guest, error: guestError } = await admin
      .from("meeting_waiting_guests")
      .select("id, name, email")
      .eq("id", guestId)
      .eq("meeting_id", id)
      .single()
    if (guestError || !guest) {
      return NextResponse.json({ error: "Convidado não encontrado" }, { status: 404 })
    }

    const { error: insertError } = await admin.from("meeting_participants").insert({
      id: guest.id,
      meeting_id: id,
      kind: "guest",
      name: guest.name,
      email: guest.email,
    })
    if (insertError) throw new Error(insertError.message)

    const { error: deleteError } = await admin.from("meeting_waiting_guests").delete().eq("id", guestId)
    if (deleteError) throw new Error(deleteError.message)

    return NextResponse.json({ meeting: await getFullMeeting(meeting) })
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
