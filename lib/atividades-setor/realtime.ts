"use client"

import { createBroadcastChannel } from "@/lib/realtime/broadcast-channel"

const ACTIVITY_EVENT = "activity-updated"
const TASK_EVENT = "task-updated"
const COMMENT_EVENT = "comment-added"

const channel = createBroadcastChannel("atividades-setor-activity")

// Payloads below are ids only, never the task/event/comment itself — a Supabase
// Realtime broadcast channel like this one is joinable by anyone holding the public
// anon key, with no per-item authorization. Broadcasting full objects used to hand
// private task titles/descriptions, comment text and @mentions, and signed attachment
// URLs to every logged-in employee regardless of canViewTask/canViewEvent permission —
// including tasks/events marked private or scoped to a different sector. Recipients
// now re-fetch over the authenticated REST API instead of trusting broadcast content
// directly (same fix already applied to lib/reunioes/realtime.ts).

export function broadcastActivityUpdated(eventId: string) {
  return channel.send(ACTIVITY_EVENT, { eventId })
}

export function broadcastTaskUpdated(taskId: string) {
  return channel.send(TASK_EVENT, { taskId })
}

export function broadcastCommentAdded(taskId: string, commentId: string) {
  return channel.send(COMMENT_EVENT, { taskId, commentId })
}

/** App-wide activity feed — mounted once in AtividadesSetorProvider. */
export function useActivitiesActivity(
  onActivityUpdated: (eventId: string) => void,
  onTaskUpdated: (taskId: string) => void,
  onCommentAdded: (taskId: string, commentId: string) => void
) {
  channel.useSubscription({
    [ACTIVITY_EVENT]: (payload) => onActivityUpdated((payload as { eventId: string }).eventId),
    [TASK_EVENT]: (payload) => onTaskUpdated((payload as { taskId: string }).taskId),
    [COMMENT_EVENT]: (payload) => {
      const p = payload as { taskId: string; commentId: string }
      onCommentAdded(p.taskId, p.commentId)
    },
  })
}
