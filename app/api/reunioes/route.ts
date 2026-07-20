import { NextResponse } from "next/server"
import { z } from "zod"

import {
  DEFAULT_GUEST_PERMISSIONS,
  MEETING_SELECT,
  getFullMeeting,
  hashMeetingPassword,
  listMeetingIdsForUser,
  requireUser,
} from "@/lib/reunioes/server"
import type { RecurrenceType } from "@/lib/reunioes/types"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_RECURRING_OCCURRENCES = 24

function nextOccurrence(date: Date, type: RecurrenceType): Date {
  const next = new Date(date)
  if (type === "daily") next.setDate(next.getDate() + 1)
  else if (type === "weekly") next.setDate(next.getDate() + 7)
  else if (type === "monthly") next.setMonth(next.getMonth() + 1)
  return next
}

/** A single-element array (possibly [null] for "start now") when not recurring,
 * otherwise every occurrence date from scheduledFor up to recurrenceUntil, capped. */
function computeOccurrences(
  scheduledFor: string | undefined,
  recurrenceType: RecurrenceType,
  recurrenceUntil: string | undefined
): (string | null)[] {
  if (!scheduledFor || recurrenceType === "none") return [scheduledFor ?? null]
  const until = new Date(recurrenceUntil!)
  const dates: string[] = []
  let current = new Date(scheduledFor)
  while (current <= until && dates.length < MAX_RECURRING_OCCURRENCES) {
    dates.push(current.toISOString())
    current = nextOccurrence(current, recurrenceType)
  }
  return dates
}

export async function GET() {
  try {
    const user = await requireUser()
    const meetingIds = await listMeetingIdsForUser(user.id)
    if (meetingIds.length === 0) return NextResponse.json({ meetings: [] })

    const admin = createAdminClient()
    // Ended meetings stay in the database untouched (audit trail), but they're never
    // fetched into the visible list — there's no "history" tab, by design.
    const { data: rows, error } = await admin
      .from("meetings")
      .select(MEETING_SELECT)
      .in("id", meetingIds)
      .neq("status", "encerrada")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)

    const meetings = await Promise.all((rows ?? []).map((row) => getFullMeeting(row)))
    return NextResponse.json({ meetings })
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

const bodySchema = z
  .object({
    title: z.string().min(1),
    invitedUserIds: z.array(z.string().uuid()),
    password: z
      .string()
      .trim()
      .min(4, "A senha deve ter pelo menos 4 caracteres")
      .max(64)
      .optional()
      .or(z.literal("")),
    scheduledFor: z.string().datetime().optional(),
    recurrenceType: z.enum(["none", "daily", "weekly", "monthly"]).optional().default("none"),
    recurrenceUntil: z.string().datetime().optional(),
    notifyInvite: z.boolean().optional().default(true),
    guestPermissions: z
      .object({ chat: z.boolean(), screenShare: z.boolean() })
      .partial()
      .optional(),
    durationMinutes: z.number().int().positive().max(24 * 60).optional(),
  })
  .refine((body) => body.recurrenceType === "none" || !!body.scheduledFor, {
    message: "Defina um horário de início para repetir a reunião",
    path: ["scheduledFor"],
  })
  .refine((body) => body.recurrenceType === "none" || !!body.recurrenceUntil, {
    message: "Defina até quando a reunião deve se repetir",
    path: ["recurrenceUntil"],
  })

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const passwordHash = body.password ? hashMeetingPassword(body.password) : null
    const guestPermissions = { ...DEFAULT_GUEST_PERMISSIONS, ...body.guestPermissions }
    const uniqueInviteeIds = [...new Set(body.invitedUserIds)].filter((id) => id !== user.id)
    const occurrences = computeOccurrences(body.scheduledFor, body.recurrenceType, body.recurrenceUntil)
    const recurrenceGroupId = occurrences.length > 1 ? crypto.randomUUID() : null

    const insertedMeetings = []
    for (const scheduledFor of occurrences) {
      const status = scheduledFor ? "agendada" : "ativa"
      // A scheduled meeting's clock only starts ticking once someone actually starts
      // it (see /[id]/join) — starting now means the budget starts now too.
      const endsAt =
        status === "ativa" && body.durationMinutes
          ? new Date(Date.now() + body.durationMinutes * 60_000).toISOString()
          : null
      const { data: meeting, error } = await admin
        .from("meetings")
        .insert({
          title: body.title,
          host_id: user.id,
          password_hash: passwordHash,
          scheduled_for: scheduledFor,
          recurrence_type: body.recurrenceType,
          recurrence_group_id: recurrenceGroupId,
          status,
          guest_permissions: guestPermissions,
          duration_minutes: body.durationMinutes ?? null,
          ends_at: endsAt,
        })
        .select(MEETING_SELECT)
        .single()
      if (error || !meeting) throw new Error(error?.message ?? "Não foi possível criar a reunião")

      // Only add the host as a participant if the meeting is starting right
      // now — a scheduled-for-later meeting gets its host participant row
      // when they actually start it (see /[id]/join).
      if (status === "ativa") {
        const { error: participantError } = await admin.from("meeting_participants").insert({
          meeting_id: meeting.id,
          kind: "registered",
          user_id: user.id,
          name: user.name,
          email: user.email,
        })
        if (participantError) throw new Error(participantError.message)
      }

      if (uniqueInviteeIds.length > 0) {
        const { error: inviteesError } = await admin
          .from("meeting_invitees")
          .insert(uniqueInviteeIds.map((userId) => ({ meeting_id: meeting.id, user_id: userId })))
        if (inviteesError) throw new Error(inviteesError.message)

        // Invitees are always added to meeting_invitees (so they see the meeting in
        // their list either way) — the center-screen popup itself is opt-out.
        if (body.notifyInvite) {
          const { error: notifyError } = await admin
            .from("meeting_invite_notifications")
            .insert(uniqueInviteeIds.map((userId) => ({ meeting_id: meeting.id, recipient_user_id: userId })))
          if (notifyError) throw new Error(notifyError.message)
        }
      }

      insertedMeetings.push(meeting)
    }

    return NextResponse.json({
      meeting: await getFullMeeting(insertedMeetings[0]),
      occurrenceCount: insertedMeetings.length,
    })
  } catch (error) {
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
