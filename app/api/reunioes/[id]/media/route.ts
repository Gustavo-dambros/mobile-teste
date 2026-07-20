import { NextResponse } from "next/server"
import { z } from "zod"

import { DEFAULT_GUEST_PERMISSIONS } from "@/lib/reunioes/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  participantId: z.string().uuid(),
  micOn: z.boolean().optional(),
  cameraOn: z.boolean().optional(),
  screenSharing: z.boolean().optional(),
  handRaised: z.boolean().optional(),
})

/** Screen share is exclusive — only one participant may hold `meetings.active_screen_share_participant_id`
 * at a time. Claiming/releasing is a conditional UPDATE (atomic at the DB level) so two people
 * clicking "share" at the same instant can't both win. */
async function claimScreenShare(admin: ReturnType<typeof createAdminClient>, meetingId: string, participantId: string) {
  const { data: meeting, error: fetchError } = await admin
    .from("meetings")
    .select("active_screen_share_participant_id")
    .eq("id", meetingId)
    .single()
  if (fetchError || !meeting) throw new Error(fetchError?.message ?? "Reunião não encontrada")

  if (meeting.active_screen_share_participant_id === participantId) return { ok: true as const }

  if (meeting.active_screen_share_participant_id) {
    const { data: holder } = await admin
      .from("meeting_participants")
      .select("name")
      .eq("id", meeting.active_screen_share_participant_id)
      .maybeSingle()
    return { ok: false as const, holderName: holder?.name ?? "Outro participante" }
  }

  const { data: claimed, error: claimError } = await admin
    .from("meetings")
    .update({ active_screen_share_participant_id: participantId })
    .eq("id", meetingId)
    .is("active_screen_share_participant_id", null)
    .select("id")
    .maybeSingle()
  if (claimError) throw new Error(claimError.message)
  if (!claimed) {
    const { data: holder } = await admin
      .from("meeting_participants")
      .select("name")
      .eq("meeting_id", meetingId)
      .eq("id", participantId)
      .maybeSingle()
    return { ok: false as const, holderName: holder?.name ?? "Outro participante" }
  }
  return { ok: true as const }
}

async function releaseScreenShare(admin: ReturnType<typeof createAdminClient>, meetingId: string, participantId: string) {
  await admin
    .from("meetings")
    .update({ active_screen_share_participant_id: null })
    .eq("id", meetingId)
    .eq("active_screen_share_participant_id", participantId)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    if (body.screenSharing === true) {
      // No session on this route (guests have none) — re-check the host-configured
      // screen-share permission here too, not just the client's disabled button.
      const { data: participant } = await admin
        .from("meeting_participants")
        .select("kind")
        .eq("id", body.participantId)
        .eq("meeting_id", id)
        .maybeSingle()
      if (participant?.kind === "guest") {
        const { data: meeting } = await admin.from("meetings").select("guest_permissions").eq("id", id).single()
        const permissions = meeting?.guest_permissions ?? DEFAULT_GUEST_PERMISSIONS
        if (!permissions.screenShare) {
          return NextResponse.json(
            { error: "O anfitrião desativou o compartilhamento de tela para convidados pelo link." },
            { status: 403 }
          )
        }
      }

      const claim = await claimScreenShare(admin, id, body.participantId)
      if (!claim.ok) {
        return NextResponse.json(
          { error: `${claim.holderName} já está compartilhando a tela.`, code: "SCREEN_SHARE_TAKEN" },
          { status: 409 }
        )
      }
    } else if (body.screenSharing === false) {
      await releaseScreenShare(admin, id, body.participantId)
    }

    // The client already blocks re-enabling a locked mic in the UI, but this route
    // has no auth check (guests have no session) — participantId alone identifies
    // the caller, so the lock must be enforced here too, not just trusted client-side.
    if (body.micOn === true) {
      const { data: participant } = await admin
        .from("meeting_participants")
        .select("mic_locked")
        .eq("id", body.participantId)
        .eq("meeting_id", id)
        .maybeSingle()
      if (participant?.mic_locked) {
        return NextResponse.json(
          { error: "O anfitrião silenciou seu microfone. Peça para liberar antes de ativar de novo." },
          { status: 403 }
        )
      }
    }

    // Same reasoning as the mic_locked check above — camera_locked has to be
    // re-enforced here too, not just trusted from the client's disabled button.
    if (body.cameraOn === true) {
      const { data: participant } = await admin
        .from("meeting_participants")
        .select("camera_locked")
        .eq("id", body.participantId)
        .eq("meeting_id", id)
        .maybeSingle()
      if (participant?.camera_locked) {
        return NextResponse.json(
          { error: "O anfitrião desligou sua câmera. Peça para liberar antes de ligar de novo." },
          { status: 403 }
        )
      }
    }

    const changes: Record<string, boolean> = {}
    if (body.micOn !== undefined) changes.mic_on = body.micOn
    if (body.cameraOn !== undefined) changes.camera_on = body.cameraOn
    if (body.screenSharing !== undefined) changes.screen_sharing = body.screenSharing
    if (body.handRaised !== undefined) changes.hand_raised = body.handRaised

    if (Object.keys(changes).length > 0) {
      const { error } = await admin
        .from("meeting_participants")
        .update(changes)
        .eq("id", body.participantId)
        .eq("meeting_id", id)
        .is("left_at", null)
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
