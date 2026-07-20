"use client"

import * as React from "react"

import type {
  AccessRequest,
  AdminUser,
  UserRole,
  UserStatus,
} from "@/components/administracao/types"
import { cpfDigits } from "@/lib/administracao/format"
import { playAccessRequestSound } from "@/lib/administracao/notification-sound"
import { notifyBrowser } from "@/lib/notifications/browser-notifications"
import { isAdmin } from "@/lib/session"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/current-user/context"

// Backstop for the postgres_changes subscription below — some networks (notably
// the one this app runs behind in production) silently block the WebSocket
// upgrade, so without this the pending-requests badge only updates on next
// full page load. Same pattern as lib/tickets/store.tsx's POLL_INTERVAL_MS.
const POLL_INTERVAL_MS = 15_000

interface ProfileRow {
  id: string
  name: string
  email: string
  phone: string | null
  sector: string
  cpf: string | null
  role: UserRole
  status: UserStatus
  is_sector_leader: boolean
  created_at: string
  deleted_at: string | null
}

interface AccessRequestRow {
  id: string
  name: string
  email: string
  phone: string
  sector: string
  cpf: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  created_at: string
  approved_by_id: string | null
  approved_at: string | null
}

function toAdminUser(row: ProfileRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    sector: row.sector,
    cpf: row.cpf,
    role: row.role,
    status: row.status,
    isSectorLeader: row.is_sector_leader,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }
}

function toAccessRequest(row: AccessRequestRow, users: AdminUser[]): AccessRequest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    sector: row.sector,
    cpf: row.cpf,
    status: row.status,
    createdAt: row.created_at,
    approvedById: row.approved_by_id,
    approvedByName: row.approved_by_id
      ? (users.find((u) => u.id === row.approved_by_id)?.name ?? null)
      : null,
    approvedAt: row.approved_at,
  }
}

interface ApproveRequestInput {
  role: UserRole
  isSectorLeader: boolean
}

type EditableUserFields = Partial<
  Pick<AdminUser, "name" | "email" | "sector" | "phone" | "role" | "isSectorLeader" | "status">
>

interface AdministracaoContextValue {
  requests: AccessRequest[]
  users: AdminUser[]
  pendingCount: number
  currentUserId: string
  status: "loading" | "success" | "error"
  retry: () => void
  approveRequest: (
    request: AccessRequest,
    input: ApproveRequestInput
  ) => Promise<{ user: AdminUser; notified: boolean }>
  rejectRequest: (requestId: string) => Promise<{ notified: boolean }>
  editUser: (id: string, changes: EditableUserFields) => Promise<void>
  setUserStatus: (id: string, status: UserStatus) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  isEmailTaken: (email: string, excludeId?: string) => boolean
  isCpfTaken: (cpf: string, excludeId?: string) => boolean
  getSectorLeader: (sector: string, excludeId?: string) => AdminUser | undefined
}

const AdministracaoContext = React.createContext<AdministracaoContextValue | null>(null)

export function AdministracaoProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser()
  const currentUserIsAdmin = isAdmin(currentUser)
  const supabase = React.useMemo(() => createClient(), [])
  const [userRows, setUserRows] = React.useState<ProfileRow[]>([])
  const [requestRows, setRequestRows] = React.useState<AccessRequestRow[]>([])
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading")
  const [attempt, setAttempt] = React.useState(0)

  const load = React.useCallback(async () => {
    if (!currentUserIsAdmin) {
      setStatus("success")
      return
    }
    const [usersResult, requestsResult] = await Promise.all([
      supabase.from("profiles").select("*").is("deleted_at", null).order("created_at"),
      supabase.from("access_requests").select("*").order("created_at", { ascending: false }),
    ])
    if (usersResult.error || requestsResult.error) {
      setStatus("error")
      return
    }
    setUserRows(usersResult.data as ProfileRow[])
    setRequestRows(requestsResult.data as AccessRequestRow[])
    setStatus("success")
  }, [supabase, currentUserIsAdmin])

  React.useEffect(() => {
    // Fetch-on-mount/refetch-on-retry: load()'s setState calls all happen
    // after its internal await, so this doesn't cause synchronous cascading
    // renders — the lint rule can't see across the await boundary here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    if (!currentUserIsAdmin) return
    const interval = window.setInterval(load, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [load, attempt, currentUserIsAdmin])

  // Keeps access_requests live without polling: new requests appear as soon
  // as they're inserted (post-OTP), and approved/rejected ones update in
  // place so the panel can drop them immediately.
  React.useEffect(() => {
    if (!currentUserIsAdmin) return
    const channel = supabase
      .channel("access_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "access_requests" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as AccessRequestRow
            setRequestRows((prev) => [row, ...prev])
            if (row.status === "PENDING") {
              playAccessRequestSound()
              notifyBrowser("Nova solicitação de acesso", `${row.name} (${row.sector}) pediu acesso.`, {
                tag: `access-request-${row.id}`,
              })
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as AccessRequestRow
            setRequestRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<AccessRequestRow>
            setRequestRows((prev) => prev.filter((r) => r.id !== oldRow.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUserIsAdmin])

  const retry = React.useCallback(() => {
    setStatus("loading")
    setAttempt((a) => a + 1)
  }, [])

  const users = React.useMemo(() => userRows.map(toAdminUser), [userRows])
  const requests = React.useMemo(
    () => requestRows.map((row) => toAccessRequest(row, users)),
    [requestRows, users]
  )

  const isEmailTaken = React.useCallback(
    (email: string, excludeId?: string) =>
      users.some((u) => u.id !== excludeId && u.email.toLowerCase() === email.trim().toLowerCase()),
    [users]
  )

  const isCpfTaken = React.useCallback(
    (cpf: string, excludeId?: string) =>
      users.some((u) => u.id !== excludeId && u.cpf !== null && cpfDigits(u.cpf) === cpfDigits(cpf)),
    [users]
  )

  const getSectorLeader = React.useCallback(
    (sector: string, excludeId?: string) =>
      users.find((u) => u.id !== excludeId && u.sector === sector && u.isSectorLeader),
    [users]
  )

  const approveRequest = React.useCallback(
    async (request: AccessRequest, input: ApproveRequestInput) => {
      const response = await fetch("/api/administracao/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          name: request.name,
          email: request.email,
          phone: request.phone,
          sector: request.sector,
          cpf: request.cpf,
          role: input.role,
          isSectorLeader: input.isSectorLeader,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Não foi possível liberar o acesso")
      await load()
      return { user: data.user as AdminUser, notified: !!data.notified }
    },
    [load]
  )

  const rejectRequest = React.useCallback(
    async (requestId: string) => {
      const response = await fetch(`/api/administracao/access-requests/${requestId}/reject`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Não foi possível rejeitar a solicitação")
      await load()
      return { notified: !!data.notified }
    },
    [load]
  )

  const editUser = React.useCallback(
    async (id: string, changes: EditableUserFields) => {
      const target = users.find((u) => u.id === id)
      if (!target) throw new Error("Usuário não encontrado")

      const emailChanged = changes.email !== undefined && changes.email !== target.email
      if (emailChanged) {
        const response = await fetch(`/api/administracao/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar o usuário")
        await load()
        return
      }

      if (changes.isSectorLeader) {
        const { error: rpcError } = await supabase.rpc("set_sector_leader", {
          p_user_id: id,
          p_sector: changes.sector ?? target.sector,
        })
        if (rpcError) throw new Error(rpcError.message)
      }

      const payload: Record<string, unknown> = {}
      if (changes.name !== undefined) payload.name = changes.name
      if (changes.sector !== undefined) payload.sector = changes.sector
      if (changes.phone !== undefined) payload.phone = changes.phone
      if (changes.role !== undefined) payload.role = changes.role
      if (changes.status !== undefined) payload.status = changes.status
      if (changes.isSectorLeader !== undefined) payload.is_sector_leader = changes.isSectorLeader

      if (Object.keys(payload).length > 0) {
        const { error } = await supabase.from("profiles").update(payload).eq("id", id)
        if (error) throw new Error(error.message)
      }
      await load()
    },
    [users, supabase, load]
  )

  const setUserStatus = React.useCallback(
    async (id: string, status: UserStatus) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id)
      if (error) throw new Error(error.message)
      await load()
    },
    [supabase, load]
  )

  const deleteUser = React.useCallback(
    async (id: string) => {
      // Scrubs every PII field instead of just flagging the row, so a deleted
      // user's name/e-mail/phone/CPF can't leak through old code paths that
      // read profiles without filtering deleted_at — the row stays only to
      // keep historical tickets/messages/kanban activity attributable.
      const { error } = await supabase
        .from("profiles")
        .update({
          deleted_at: new Date().toISOString(),
          is_sector_leader: false,
          status: "BLOCKED",
          name: "Usuário removido",
          email: `usuario-removido-${id}@removido.invalid`,
          phone: null,
          cpf: null,
        })
        .eq("id", id)
      if (error) throw new Error(error.message)
      await load()
    },
    [supabase, load]
  )

  const pendingCount = React.useMemo(
    () => requests.filter((r) => r.status === "PENDING").length,
    [requests]
  )

  const value = React.useMemo<AdministracaoContextValue>(
    () => ({
      requests,
      users,
      pendingCount,
      currentUserId: currentUser?.id ?? "",
      status,
      retry,
      approveRequest,
      rejectRequest,
      editUser,
      setUserStatus,
      deleteUser,
      isEmailTaken,
      isCpfTaken,
      getSectorLeader,
    }),
    [
      requests,
      users,
      pendingCount,
      currentUser,
      status,
      retry,
      approveRequest,
      rejectRequest,
      editUser,
      setUserStatus,
      deleteUser,
      isEmailTaken,
      isCpfTaken,
      getSectorLeader,
    ]
  )

  return (
    <AdministracaoContext.Provider value={value}>{children}</AdministracaoContext.Provider>
  )
}

export function useAdministracao() {
  const ctx = React.useContext(AdministracaoContext)
  if (!ctx) {
    throw new Error("useAdministracao must be used within an AdministracaoProvider")
  }
  return ctx
}
