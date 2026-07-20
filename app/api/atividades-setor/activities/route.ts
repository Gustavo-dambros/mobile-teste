import { NextResponse } from "next/server"
import { z } from "zod"

import { isSystemAdmin } from "@/lib/atividades-setor/permissions"
import { ACTIVITY_SELECT, addHistory, mapActivityRow, notify, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Refetched in full on every poll (lib/atividades-setor/store.tsx) — this
// caps the pathological case of years of accumulated activities, well above
// any realistic real-world count.
const MAX_ACTIVITIES = 2000

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

export async function GET() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()

    let query = admin.from("activities").select(ACTIVITY_SELECT)
    if (!isSystemAdmin(user)) {
      query = query.is("deleted_at", null)
      const orParts = [
        `creator_id.eq.${user.id}`,
        `participant_ids.cs.{${user.id}}`,
        `invited_user_ids.cs.{${user.id}}`,
        `invited_sector_ids.cs.{${user.sector}}`,
      ]
      orParts.push(
        user.isSectorLeader ? `sector.eq.${user.sector}` : `and(visibility.eq.setor,sector.eq.${user.sector})`
      )
      query = query.or(orParts.join(","))
    }

    const { data, error } = await query.order("date", { ascending: false }).limit(MAX_ACTIVITIES)
    if (error) throw new Error(error.message)

    return NextResponse.json({ activities: (data ?? []).map(mapActivityRow) })
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

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = bodySchema.parse(await request.json())
    if (!isSystemAdmin(user) && input.sector !== user.sector) {
      return NextResponse.json(
        { error: "Você só pode criar atividades para o seu próprio setor" },
        { status: 403 }
      )
    }
    const admin = createAdminClient()

    const { data: activity, error } = await admin
      .from("activities")
      .insert({
        title: input.title,
        description: input.description,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        all_day: input.allDay,
        location: input.location,
        meeting_link: input.meetingLink,
        sector: input.sector,
        creator_id: user.id,
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
      })
      .select(ACTIVITY_SELECT)
      .single()
    if (error || !activity) throw new Error(error?.message ?? "Não foi possível criar a atividade")

    await addHistory(admin, {
      entityType: "event",
      entityId: activity.id,
      actorId: user.id,
      action: "event_created",
    })

    const recipients = new Set([...input.participantIds, ...input.invitedUserIds])
    recipients.delete(user.id)
    await notify(
      admin,
      Array.from(recipients).map((uid) => ({
        type: "event_invite" as const,
        recipientUserId: uid,
        relatedType: "event" as const,
        relatedId: activity.id,
        title: "Convite para atividade",
        message: `${user.name} convidou você para "${input.title}"`,
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
