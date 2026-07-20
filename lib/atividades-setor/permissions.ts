import type { SessionUser } from "@/lib/session"

/**
 * Pure, framework-agnostic permission rules — no React, no fetch, no
 * Supabase. Server routes call these after loading the real row (never
 * trusting the client), and client components call the exact same
 * functions with already-fetched data purely to decide what to render.
 * Never rely on hiding a button as the only guard — the server re-checks
 * every mutation itself.
 */
export type PermissionUser = Pick<SessionUser, "id" | "role" | "sector" | "isSectorLeader">

export function isSystemAdmin(user: PermissionUser): boolean {
  return user.role === "ADMIN"
}

/** Real sector leadership (profiles.is_sector_leader) — one leader per sector, managed in Administração. */
export function managesSector(user: PermissionUser, sector: string): boolean {
  return isSystemAdmin(user) || (user.sector === sector && user.isSectorLeader)
}

export type UserRole = "admin" | "gestor" | "colaborador"

export function getUserRole(user: PermissionUser): UserRole {
  if (isSystemAdmin(user)) return "admin"
  return user.isSectorLeader ? "gestor" : "colaborador"
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface TaskPermissionFields {
  sector: string
  creatorId: string
  assigneeId: string
  watcherIds: string[]
}

/** Only who created the task (or a system admin) may edit or delete it. */
export function canEditTask(user: PermissionUser, task: Pick<TaskPermissionFields, "creatorId">): boolean {
  return isSystemAdmin(user) || task.creatorId === user.id
}

export const canDeleteTask = canEditTask

export function canArchiveTask(user: PermissionUser, task: Pick<TaskPermissionFields, "sector">): boolean {
  return managesSector(user, task.sector)
}

export function canRestoreTask(user: PermissionUser): boolean {
  return isSystemAdmin(user)
}

export const canHardDeleteTask = canRestoreTask

/** Responsible can move their own card; gestor/admin can move anything in-sector. */
export function canChangeTaskStatus(
  user: PermissionUser,
  task: Pick<TaskPermissionFields, "sector" | "assigneeId">
): boolean {
  return managesSector(user, task.sector) || task.assigneeId === user.id
}

/**
 * Task visibility is scoped to the activity's own circle — sector manager/
 * admin oversight, the assignee, the creator, or an explicit watcher. Being
 * in the same sector is *not* enough on its own (unlike an activity's
 * "setor" visibility) — only who was actually assigned to it sees its tasks.
 */
export function canViewTask(user: PermissionUser, task: TaskPermissionFields): boolean {
  if (managesSector(user, task.sector)) return true
  return task.assigneeId === user.id || task.creatorId === user.id || task.watcherIds.includes(user.id)
}

/** Comment/attach access: sector staff, gestor/admin, or anyone explicitly tied to the task. */
export const canCommentOnTask = canViewTask
export const canAttachToTask = canViewTask

// ---------------------------------------------------------------------------
// Activities ("atividades")
// ---------------------------------------------------------------------------

export interface ActivityPermissionFields {
  sector: string
  creatorId: string
  participantIds: string[]
  invitedUserIds: string[]
  invitedSectorIds: string[]
  visibility: string
}

/** Only who created the activity (or a system admin) may edit/delete/cancel it. */
export function canEditEvent(user: PermissionUser, event: Pick<ActivityPermissionFields, "creatorId">): boolean {
  return isSystemAdmin(user) || event.creatorId === user.id
}

export const canDeleteEvent = canEditEvent
export const canCancelEvent = canEditEvent

export function canViewEvent(user: PermissionUser, event: ActivityPermissionFields): boolean {
  if (managesSector(user, event.sector)) return true
  if (event.creatorId === user.id) return true
  if (event.participantIds.includes(user.id) || event.invitedUserIds.includes(user.id)) return true
  if (event.invitedSectorIds.includes(user.sector)) return true
  if (event.visibility === "setor") return event.sector === user.sector
  return false
}
