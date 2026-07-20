import { NextResponse } from "next/server"
import { z } from "zod"

import { ReunioesHostError, recordGuestDenial, requireHostMeeting, requireUser } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ guestId: z.string().uuid() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { guestId } = bodySchema.parse(await request.json())
    await requireHostMeeting(id, user)
    const admin = createAdminClient()

    const { data: guest } = await admin
      .from("meeting_waiting_guests")
      .select("email")
      .eq("id", guestId)
      .eq("meeting_id", id)
      .maybeSingle()

    const { error: deleteError } = await admin
      .from("meeting_waiting_guests")
      .delete()
      .eq("id", guestId)
      .eq("meeting_id", id)
    if (deleteError) throw new Error(deleteError.message)

    if (guest?.email) await recordGuestDenial(id, guest.email)

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
