import { NextResponse } from "next/server"

import { isSystemAdmin } from "@/lib/atividades-setor/permissions"
import { mapNotificationRow, NOTIFICATION_SELECT, requireUser } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_NOTIFICATIONS = 200

function reminderLabel(offsetMinutes: number) {
  if (offsetMinutes >= 1440) return `${Math.round(offsetMinutes / 1440)} dia(s)`
  if (offsetMinutes >= 60) return `${Math.round(offsetMinutes / 60)} hora(s)`
  return `${offsetMinutes} minutos`
}

/**
 * Called by each logged-in client on an interval — scoped entirely to the
 * caller's own notifications (mirrors app/api/announcements/notifications/sync),
 * not a global sweep. A sector leader/admin also gets "overdue in my sector"
 * notifications for tasks assigned to other people, generated the same way
 * whenever *their own* client runs this sync — never generated on someone
 * else's behalf.
 */
export async function POST() {
  try {
    const user = await requireUser()
    const admin = createAdminClient()
    const nowMs = Date.now()

    const { data: existingNotifications } = await admin
      .from("activity_notifications")
      .select("related_id, type")
      .eq("recipient_user_id", user.id)
      .in("type", ["due_soon", "task_overdue"])
    const existingKey = (relatedId: string, type: string) => `${relatedId}:${type}`
    const existing = new Set((existingNotifications ?? []).map((n) => existingKey(n.related_id, n.type)))

    const toInsert: {
      type: string
      recipient_user_id: string
      related_type: string
      related_id: string
      title: string
      message: string
    }[] = []

    const { data: myTasks } = await admin
      .from("activity_tasks")
      .select("id, title, due_date, due_time, status")
      .eq("assignee_id", user.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .neq("status", "concluida")
      .not("due_date", "is", null)
    for (const task of myTasks ?? []) {
      const dueMs = new Date(`${task.due_date}T${task.due_time ?? "23:59"}:00`).getTime()
      const hoursUntilDue = (dueMs - nowMs) / (1000 * 60 * 60)
      if (hoursUntilDue <= 24 && hoursUntilDue > 0 && !existing.has(existingKey(task.id, "due_soon"))) {
        toInsert.push({
          type: "due_soon",
          recipient_user_id: user.id,
          related_type: "task",
          related_id: task.id,
          title: "Prazo próximo",
          message: `A tarefa "${task.title}" vence em breve`,
        })
      } else if (hoursUntilDue <= 0 && !existing.has(existingKey(task.id, "task_overdue"))) {
        toInsert.push({
          type: "task_overdue",
          recipient_user_id: user.id,
          related_type: "task",
          related_id: task.id,
          title: "Tarefa atrasada",
          message: `A tarefa "${task.title}" está atrasada`,
        })
      }
    }

    if (user.isSectorLeader || isSystemAdmin(user)) {
      let managedQuery = admin
        .from("activity_tasks")
        .select("id, title, due_date, due_time, status, sector")
        .neq("assignee_id", user.id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .neq("status", "concluida")
        .not("due_date", "is", null)
      if (!isSystemAdmin(user)) managedQuery = managedQuery.eq("sector", user.sector)
      const { data: managedTasks } = await managedQuery
      for (const task of managedTasks ?? []) {
        const dueMs = new Date(`${task.due_date}T${task.due_time ?? "23:59"}:00`).getTime()
        if (nowMs < dueMs) continue
        if (existing.has(existingKey(task.id, "task_overdue"))) continue
        toInsert.push({
          type: "task_overdue",
          recipient_user_id: user.id,
          related_type: "task",
          related_id: task.id,
          title: "Tarefa atrasada no seu setor",
          message: `A tarefa "${task.title}" está atrasada`,
        })
      }
    }

    const { data: myActivities } = await admin
      .from("activities")
      .select("id, title, date, start_time, all_day, reminders, creator_id")
      .is("deleted_at", null)
      .is("cancelled_at", null)
      .or(`participant_ids.cs.{${user.id}},invited_user_ids.cs.{${user.id}}`)
    const { data: existingReminders } = await admin
      .from("activity_notifications")
      .select("related_id, message")
      .eq("recipient_user_id", user.id)
      .eq("type", "event_reminder")
    const existingReminderKeys = new Set((existingReminders ?? []).map((n) => `${n.related_id}:${n.message}`))

    for (const activity of myActivities ?? []) {
      if (activity.creator_id === user.id || activity.all_day) continue
      const reminders = (activity.reminders ?? []) as { offsetMinutes: number }[]
      if (reminders.length === 0) continue
      const eventAtMs = new Date(`${activity.date}T${activity.start_time ?? "00:00"}:00`).getTime()
      if (nowMs >= eventAtMs) continue
      for (const reminder of reminders) {
        const triggerAtMs = eventAtMs - reminder.offsetMinutes * 60_000
        if (nowMs < triggerAtMs) continue
        const message = `Lembrete: "${activity.title}" começa em ${reminderLabel(reminder.offsetMinutes)}`
        if (existingReminderKeys.has(`${activity.id}:${message}`)) continue
        toInsert.push({
          type: "event_reminder",
          recipient_user_id: user.id,
          related_type: "event",
          related_id: activity.id,
          title: "Lembrete de atividade",
          message,
        })
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await admin.from("activity_notifications").insert(toInsert)
      if (insertError) throw new Error(insertError.message)
    }

    const { data: notifications, error } = await admin
      .from("activity_notifications")
      .select(NOTIFICATION_SELECT)
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS)
    if (error) throw new Error(error.message)

    return NextResponse.json({ notifications: (notifications ?? []).map(mapNotificationRow) })
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
