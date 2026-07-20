import { NextResponse } from "next/server"
import { z } from "zod"

import { canEditEvent, isSystemAdmin } from "@/lib/atividades-setor/permissions"
import {
  ACTIVITY_SELECT,
  addHistory,
  canAccessActivity,
  mapActivityRow,
  notify,
  requireUser,
} from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  sector: z.string().min(1),
  participantIds: z.array(z.string()).default([]),
  invitedUserIds: z.array(z.string()).default([]),
  invitedSectorIds: z.array(z.string()).default([]),
  visibility: z.enum(["setor", "participantes", "privado", "convidados", "setores_convidados"]),
  color: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.any()).default([]),
  recurrence: z.any().optional(),
  reminders: z.array(z.object({ offsetMinutes: z.number() })).default([]),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const admin = createAdminClient()

    if (!(await canAccessActivity(user, id))) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    }
    const { data, error } = await admin.from("activities").select(ACTIVITY_SELECT).eq("id", id).single()
    if (error || !data) throw new Error(error?.message ?? "Atividade não encontrada")

    return NextResponse.json({ activity: mapActivityRow(data) })
  } catch (error) {
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const input = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: current } = await admin
      .from("activities")
      .select("creator_id, participant_ids, invited_user_ids, title")
      .eq("id", id)
      .single()
    if (!current) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    if (!canEditEvent(user, { creatorId: current.creator_id })) {
      return NextResponse.json({ error: "Você não tem permissão para editar esta atividade" }, { status: 403 })
    }
    if (!isSystemAdmin(user) && input.sector !== user.sector) {
      return NextResponse.json(
        { error: "Você só pode mover a atividade para o seu próprio setor" },
        { status: 403 }
      )
    }

    const { data: activity, error } = await admin
      .from("activities")
      .update({
        title: input.title,
        description: input.description,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        all_day: input.allDay,
        location: input.location,
        meeting_link: input.meetingLink,
        sector: input.sector,
        participant_ids: input.participantIds,
        invited_user_ids: input.invitedUserIds,
        invited_sector_ids: input.invitedSectorIds,
        visibility: input.visibility,
        color: input.color,
        category: input.category,
        tags: input.tags,
        recurrence: input.recurrence,
        reminders: input.reminders,
        attachments: input.attachments,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ACTIVITY_SELECT)
      .single()
    if (error || !activity) throw new Error(error?.message ?? "Não foi possível salvar a atividade")

    await addHistory(admin, { entityType: "event", entityId: id, actorId: user.id, action: "event_changed" })

    const recipients = new Set([
      ...current.participant_ids,
      ...current.invited_user_ids,
      ...input.participantIds,
      ...input.invitedUserIds,
    ])
    recipients.delete(user.id)
    await notify(
      admin,
      Array.from(recipients).map((uid) => ({
        type: "event_changed" as const,
        recipientUserId: uid,
        relatedType: "event" as const,
        relatedId: id,
        title: "Atividade atualizada",
        message: `A atividade "${input.title}" foi atualizada`,
      }))
    )

    return NextResponse.json({ activity: mapActivityRow(activity) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
