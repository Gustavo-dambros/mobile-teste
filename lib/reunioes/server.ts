import "server-only"

import { createHash } from "crypto"

import type { SessionUser } from "@/lib/session"
import { getCurrentUser } from "@/lib/session-server"
import { stopActiveRecordingForMeeting } from "@/lib/reunioes/recordings"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  GuestPermissions,
  Meeting,
  MeetingChatMessage,
  MeetingParticipant,
  MeetingRecordingSummary,
  WaitingGuest,
} from "@/lib/reunioes/types"

export const DEFAULT_GUEST_PERMISSIONS: GuestPermissions = { chat: true, screenShare: true }

/** Same sha256+pepper convention as lib/access-request/otp.ts — good enough for an internal meeting gate, not a login credential. */
export function hashMeetingPassword(password: string) {
  const pepper = process.env.OTP_HASH_PEPPER
  if (!pepper) throw new Error("OTP_HASH_PEPPER não configurado no .env.local")
  return createHash("sha256").update(`${password}:${pepper}`).digest("hex")
}

export class ReunioesAuthError extends Error {
  constructor(message = "Não autenticado") {
    super(message)
    this.name = "ReunioesAuthError"
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new ReunioesAuthError()
  return user
}

// Supabase's untyped query builder infers to-one embedded relations as
// arrays since it can't see the FK's uniqueness — normalize either shape.
type Embed<T> = T | T[] | null
function one<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const MEETING_SELECT = `
  id, title, host_id, invite_token, status, password_hash, created_at, ended_at,
  scheduled_for, recurrence_type, recurrence_group_id, locked, active_screen_share_participant_id,
  guest_permissions, duration_minutes, ends_at,
  host:profiles!meetings_host_id_fkey(name)
`

interface MeetingRow {
  id: string
  title: string
  host_id: string
  invite_token: string
  status: string
  password_hash: string | null
  created_at: string
  ended_at: string | null
  scheduled_for: string | null
  recurrence_type: string
  recurrence_group_id: string | null
  locked: boolean
  active_screen_share_participant_id: string | null
  guest_permissions: GuestPermissions | null
  duration_minutes: number | null
  ends_at: string | null
  host: Embed<{ name: string }>
}

interface ParticipantRow {
  id: string
  kind: string
  user_id: string | null
  name: string
  email: string | null
  joined_at: string
  mic_on: boolean
  mic_locked: boolean
  camera_on: boolean
  camera_locked: boolean
  screen_sharing: boolean
  hand_raised: boolean
}

function mapParticipantRow(row: ParticipantRow): MeetingParticipant {
  return {
    id: row.id,
    kind: row.kind as MeetingParticipant["kind"],
    userId: row.user_id ?? undefined,
    name: row.name,
    email: row.email ?? undefined,
    joinedAt: row.joined_at,
    micOn: row.mic_on,
    micLocked: row.mic_locked,
    cameraOn: row.camera_on,
    cameraLocked: row.camera_locked,
    screenSharing: row.screen_sharing,
    handRaised: row.hand_raised,
  }
}

interface WaitingGuestRow {
  id: string
  name: string
  email: string
  requested_at: string
}

function mapWaitingGuestRow(row: WaitingGuestRow): WaitingGuest {
  return { id: row.id, name: row.name, email: row.email, requestedAt: row.requested_at }
}

interface ChatMessageRow {
  id: string
  author_participant_id: string | null
  author_name: string
  text: string
  created_at: string
  attachment_url: string | null
  attachment_name: string | null
}

export function mapChatMessageRow(row: ChatMessageRow): MeetingChatMessage {
  return {
    id: row.id,
    authorParticipantId: row.author_participant_id ?? "",
    authorName: row.author_name,
    text: row.text,
    createdAt: row.created_at,
    attachmentUrl: row.attachment_url ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
  }
}

export async function getMeetingParticipants(
  meetingId: string,
  { activeOnly = true }: { activeOnly?: boolean } = {}
): Promise<MeetingParticipant[]> {
  const admin = createAdminClient()
  let query = admin
    .from("meeting_participants")
    .select(
      "id, kind, user_id, name, email, joined_at, mic_on, mic_locked, camera_on, camera_locked, screen_sharing, hand_raised"
    )
    .eq("meeting_id", meetingId)
    .order("joined_at")
  if (activeOnly) query = query.is("left_at", null)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapParticipantRow)
}

export async function getMeetingWaitingGuests(meetingId: string): Promise<WaitingGuest[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("meeting_waiting_guests")
    .select("id, name, email, requested_at")
    .eq("meeting_id", meetingId)
    .order("requested_at")
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapWaitingGuestRow)
}

// getFullMeeting refetches this on every list/in-call poll (see
// LIST_POLL_INTERVAL_MS/MEETING_POLL_INTERVAL_MS in lib/reunioes/store.tsx) —
// without a cap, a long call with a lot of chat re-downloads its entire
// history every few seconds. Meeting chat is ephemeral by nature (nobody
// scrolls back through an old call's chat the way they would a ticket), so
// capping to the most recent messages is a safe, simple fix.
const MAX_CHAT_MESSAGES = 200

export async function getMeetingChatMessages(meetingId: string): Promise<MeetingChatMessage[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("meeting_chat_messages")
    .select("id, author_participant_id, author_name, text, created_at, attachment_url, attachment_name")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false })
    .limit(MAX_CHAT_MESSAGES)
  if (error) throw new Error(error.message)
  return (data ?? []).reverse().map(mapChatMessageRow)
}

export async function getMeetingInviteeIds(meetingId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("meeting_invitees")
    .select("user_id")
    .eq("meeting_id", meetingId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.user_id)
}

export async function getLatestRecording(meetingId: string): Promise<MeetingRecordingSummary | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("meeting_recordings")
    .select("id, status")
    .eq("meeting_id", meetingId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { id: data.id, status: data.status as MeetingRecordingSummary["status"] } : null
}

/** Flips an overdue 'ativa' meeting to 'encerrada' the same way the manual "Encerrar
 * para todos" button does — checked lazily on every read (getFullMeeting) rather than
 * a dedicated cron job, same "reconcile on read" pattern as recording finalization.
 * Guarded by .eq("status", "ativa") so two concurrent reads racing this don't both
 * try to end it. */
async function autoEndIfOverdue(row: MeetingRow): Promise<MeetingRow> {
  if (row.status !== "ativa" || !row.ends_at) return row
  if (new Date(row.ends_at) > new Date()) return row

  const admin = createAdminClient()
  const endedAt = new Date().toISOString()
  const { data: updated } = await admin
    .from("meetings")
    .update({ status: "encerrada", ended_at: endedAt })
    .eq("id", row.id)
    .eq("status", "ativa")
    .select(MEETING_SELECT)
    .maybeSingle()
  if (!updated) return row // lost the race to another concurrent request — it already handled this

  await admin.from("meeting_participants").update({ left_at: endedAt }).eq("meeting_id", row.id).is("left_at", null)
  await admin.from("meeting_invite_notifications").update({ read: true }).eq("meeting_id", row.id).eq("read", false)
  await stopActiveRecordingForMeeting(row.id)

  return updated as MeetingRow
}

/** Fetches every related row and assembles the full client-shaped Meeting. */
export async function getFullMeeting(rawRow: MeetingRow): Promise<Meeting> {
  const row = await autoEndIfOverdue(rawRow)
  const host = one(row.host)
  const [invitedUserIds, participants, waitingGuests, chatMessages, latestRecording] = await Promise.all([
    getMeetingInviteeIds(row.id),
    getMeetingParticipants(row.id),
    getMeetingWaitingGuests(row.id),
    getMeetingChatMessages(row.id),
    getLatestRecording(row.id),
  ])
  return {
    id: row.id,
    title: row.title,
    hostId: row.host_id,
    hostName: host?.name ?? "",
    inviteToken: row.invite_token,
    status: row.status as Meeting["status"],
    scheduledFor: row.scheduled_for ?? undefined,
    recurrenceType: row.recurrence_type as Meeting["recurrenceType"],
    recurrenceGroupId: row.recurrence_group_id ?? undefined,
    locked: row.locked,
    activeScreenShareParticipantId: row.active_screen_share_participant_id ?? undefined,
    isRecording: latestRecording?.status === "recording",
    latestRecording: latestRecording ?? undefined,
    invitedUserIds,
    participants,
    waitingGuests,
    chatMessages,
    hasPassword: row.password_hash !== null,
    guestPermissions: row.guest_permissions ?? DEFAULT_GUEST_PERMISSIONS,
    durationMinutes: row.duration_minutes ?? undefined,
    endsAt: row.ends_at ?? undefined,
    createdAt: row.created_at,
    endedAt: row.ended_at ?? undefined,
  }
}

/** Meeting ids where the user is host, invited, or has ever been a participant. */
export async function listMeetingIdsForUser(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const [hosted, invited, participated] = await Promise.all([
    admin.from("meetings").select("id").eq("host_id", userId),
    admin.from("meeting_invitees").select("meeting_id").eq("user_id", userId),
    admin.from("meeting_participants").select("meeting_id").eq("user_id", userId),
  ])
  if (hosted.error) throw new Error(hosted.error.message)
  if (invited.error) throw new Error(invited.error.message)
  if (participated.error) throw new Error(participated.error.message)

  const ids = new Set<string>()
  for (const r of hosted.data ?? []) ids.add(r.id)
  for (const r of invited.data ?? []) ids.add(r.meeting_id)
  for (const r of participated.data ?? []) ids.add(r.meeting_id)
  return [...ids]
}

/** First-time entries stop being accepted this many minutes after `scheduled_for` — anyone who
 * already has a meeting_participants row (joined before the cutoff) can always reconnect. */
export const ENTRY_CUTOFF_GRACE_MINUTES = 15

/** Server-clock (Postgres now()) check — never Date.now(), since the Node process clock isn't
 * a trustworthy authority either and the whole point is a check nobody can spoof from outside. */
export async function isEntryCutoffPassed(scheduledFor: string | null): Promise<boolean> {
  if (!scheduledFor) return false
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("meeting_entry_cutoff_passed", {
    scheduled: scheduledFor,
    grace_minutes: ENTRY_CUTOFF_GRACE_MINUTES,
  })
  if (error) throw new Error(error.message)
  return !!data
}

const PASSWORD_MAX_ATTEMPTS = 5
const PASSWORD_ATTEMPT_WINDOW_MINUTES = 10
const PASSWORD_LOCKOUT_MINUTES = 10

/** Throws when the (meeting, email) pair is currently locked out from further password guesses. */
export class PasswordRateLimitError extends Error {
  constructor() {
    super("Muitas tentativas incorretas. Tente novamente em alguns minutos.")
    this.name = "PasswordRateLimitError"
  }
}

/** Checks the rolling attempt window before letting a password guess through — throws
 * PasswordRateLimitError if locked out. Mirrors lib/access-request/otp.ts's attempts counter,
 * keyed by (meeting, email) instead of a single OTP row since a guest can retry indefinitely
 * without ever creating one. */
export async function assertPasswordAttemptAllowed(meetingId: string, email: string) {
  const admin = createAdminClient()
  const { data: row } = await admin
    .from("meeting_password_attempts")
    .select("id, attempts, window_started_at, locked_until")
    .eq("meeting_id", meetingId)
    .eq("email", email)
    .maybeSingle()
  if (!row) return

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    throw new PasswordRateLimitError()
  }
  const windowExpired =
    Date.now() - new Date(row.window_started_at).getTime() > PASSWORD_ATTEMPT_WINDOW_MINUTES * 60_000
  if (windowExpired) {
    await admin
      .from("meeting_password_attempts")
      .update({ attempts: 0, window_started_at: new Date().toISOString(), locked_until: null })
      .eq("id", row.id)
  }
}

export async function recordPasswordFailure(meetingId: string, email: string) {
  const admin = createAdminClient()
  const { data: row } = await admin
    .from("meeting_password_attempts")
    .select("id, attempts")
    .eq("meeting_id", meetingId)
    .eq("email", email)
    .maybeSingle()

  const nextAttempts = (row?.attempts ?? 0) + 1
  const locked = nextAttempts >= PASSWORD_MAX_ATTEMPTS
  const patch = {
    attempts: locked ? 0 : nextAttempts,
    window_started_at: new Date().toISOString(),
    locked_until: locked ? new Date(Date.now() + PASSWORD_LOCKOUT_MINUTES * 60_000).toISOString() : null,
  }
  if (row) {
    await admin.from("meeting_password_attempts").update(patch).eq("id", row.id)
  } else {
    await admin.from("meeting_password_attempts").insert({ meeting_id: meetingId, email, ...patch })
  }
}

export async function resetPasswordAttempts(meetingId: string, email: string) {
  const admin = createAdminClient()
  await admin.from("meeting_password_attempts").delete().eq("meeting_id", meetingId).eq("email", email)
}

const DENY_COOLDOWN_MINUTES = 2

export class DenyCooldownError extends Error {
  constructor() {
    super("O anfitrião ainda não liberou sua entrada. Tente novamente em alguns minutos.")
    this.name = "DenyCooldownError"
  }
}

/** Recorded when the host clicks "Recusar" on a waiting guest — throttles that same
 * (meeting, email) from immediately re-submitting the entry form and reappearing in
 * the waiting room over and over. */
export async function recordGuestDenial(meetingId: string, email: string) {
  const admin = createAdminClient()
  await admin
    .from("meeting_deny_cooldowns")
    .upsert(
      { meeting_id: meetingId, email, denied_at: new Date().toISOString() },
      { onConflict: "meeting_id,email" }
    )
}

/** Throws DenyCooldownError if this (meeting, email) was denied too recently. */
export async function assertNotRecentlyDenied(meetingId: string, email: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("meeting_deny_cooldowns")
    .select("denied_at")
    .eq("meeting_id", meetingId)
    .eq("email", email)
    .maybeSingle()
  if (!data) return
  const elapsedMs = Date.now() - new Date(data.denied_at).getTime()
  if (elapsedMs < DENY_COOLDOWN_MINUTES * 60_000) {
    throw new DenyCooldownError()
  }
}

/** True when this user (by id) or guest (by email) is currently blocked from this meeting —
 * survives refresh/different browser/incognito since it's keyed server-side, not local state. */
export async function isParticipantBlocked(
  meetingId: string,
  { userId, email }: { userId?: string; email?: string }
): Promise<boolean> {
  if (!userId && !email) return false
  const admin = createAdminClient()
  let query = admin
    .from("meeting_blocked_participants")
    .select("id")
    .eq("meeting_id", meetingId)
    .is("unblocked_at", null)
  query = userId ? query.eq("user_id", userId) : query.eq("email", email!)
  const { data } = await query.maybeSingle()
  return !!data
}

export async function logMeetingAdminAction(params: {
  meetingId: string
  actorId: string
  action: string
  targetParticipantId?: string
  targetLabel?: string
}) {
  const admin = createAdminClient()
  await admin.from("meeting_admin_actions").insert({
    meeting_id: params.meetingId,
    actor_id: params.actorId,
    action: params.action,
    target_participant_id: params.targetParticipantId ?? null,
    target_label: params.targetLabel ?? null,
  })
}

export class ReunioesHostError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ReunioesHostError"
    this.status = status
  }
}

/** Fetches the meeting and throws unless `user` is its host — shared by every host-only action route. */
export async function requireHostMeeting(meetingId: string, user: SessionUser): Promise<MeetingRow> {
  const admin = createAdminClient()
  const { data: meeting, error } = await admin
    .from("meetings")
    .select(MEETING_SELECT)
    .eq("id", meetingId)
    .single()
  if (error || !meeting) throw new ReunioesHostError("Reunião não encontrada", 404)
  if (meeting.host_id !== user.id) throw new ReunioesHostError("Apenas o anfitrião pode fazer isso", 403)
  if (meeting.status === "encerrada") throw new ReunioesHostError("Esta reunião já foi encerrada", 400)
  return meeting
}

const OTP_SEND_COOLDOWN_SECONDS = 60

export class OtpSendRateLimitError extends Error {
  constructor() {
    super("Aguarde um pouco antes de pedir um novo código.")
    this.name = "OtpSendRateLimitError"
  }
}

/** Anyone holding a still-valid invite link can request an OTP for any
 * @unipar.br email (not necessarily their own) — without this, send-otp had
 * no throttle at all, letting it be used to spam an arbitrary inbox with
 * verification-code emails. Throws if the same (meeting, email) pair
 * requested a code within the last OTP_SEND_COOLDOWN_SECONDS. */
export async function assertOtpSendAllowed(meetingId: string, email: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("meeting_join_otps")
    .select("created_at")
    .eq("meeting_id", meetingId)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return
  const elapsedMs = Date.now() - new Date(data.created_at).getTime()
  if (elapsedMs < OTP_SEND_COOLDOWN_SECONDS * 1000) {
    throw new OtpSendRateLimitError()
  }
}

export class GuestJoinError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "GuestJoinError"
    this.status = status
  }
}

export interface GuestJoinMeeting {
  id: string
  status: string
  password_hash: string | null
  locked: boolean
  scheduled_for: string | null
}

/** Every check a guest joining via invite link must pass, shared by the invite
 * send-otp and request routes — the OTP step and the waiting-room "knock" both
 * need to agree the meeting is actually joinable before doing their part. */
export async function validateGuestJoinRequest(
  token: string,
  { email, password }: { email: string; password?: string }
): Promise<GuestJoinMeeting> {
  const admin = createAdminClient()

  const { data: meeting, error } = await admin
    .from("meetings")
    .select("id, status, password_hash, locked, scheduled_for")
    .eq("invite_token", token)
    .single()
  if (error || !meeting) {
    throw new GuestJoinError("Link inválido", 404)
  }
  if (meeting.status === "encerrada") {
    throw new GuestJoinError("Esta reunião já foi encerrada", 400)
  }
  if (meeting.status === "agendada") {
    throw new GuestJoinError("Esta reunião ainda não começou", 400)
  }
  if (meeting.locked) {
    throw new GuestJoinError("O anfitrião bloqueou a entrada nesta reunião", 400)
  }

  if (await isParticipantBlocked(meeting.id, { email })) {
    throw new GuestJoinError(
      "Você foi removido desta reunião. Peça ao anfitrião para convidá-lo novamente.",
      403
    )
  }

  await assertNotRecentlyDenied(meeting.id, email)

  const { data: existingGuestParticipant } = await admin
    .from("meeting_participants")
    .select("id")
    .eq("meeting_id", meeting.id)
    .eq("kind", "guest")
    .eq("email", email)
    .maybeSingle()
  if (!existingGuestParticipant && (await isEntryCutoffPassed(meeting.scheduled_for))) {
    throw new GuestJoinError("O prazo de entrada para esta reunião foi encerrado.", 403)
  }

  if (meeting.password_hash !== null) {
    if (!password) {
      throw new GuestJoinError("Informe a senha da reunião", 400)
    }
    await assertPasswordAttemptAllowed(meeting.id, email)
    if (hashMeetingPassword(password) !== meeting.password_hash) {
      await recordPasswordFailure(meeting.id, email)
      throw new GuestJoinError("Senha incorreta", 400)
    }
    await resetPasswordAttempts(meeting.id, email)
  }

  return meeting
}
