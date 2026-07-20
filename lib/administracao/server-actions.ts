import "server-only"

import type { AdminUser, UserRole } from "@/components/administracao/types"
import { cpfDigits } from "@/lib/administracao/format"
import { sendWhatsAppText, toWhatsAppNumber } from "@/lib/evolution/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/session-server"

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "ADMIN") {
    throw new AdminAuthError()
  }
  return user
}

export class AdminAuthError extends Error {
  constructor() {
    super("Acesso restrito a administradores")
    this.name = "AdminAuthError"
  }
}

interface CreateAuthUserAndProfileInput {
  name: string
  email: string
  phone: string
  sector: string
  cpf: string
  role: UserRole
  isSectorLeader: boolean
}

export async function createAuthUserAndProfile(
  input: CreateAuthUserAndProfileInput
): Promise<{ user: AdminUser; notified: boolean }> {
  const admin = createAdminClient()
  const cpfOnlyDigits = cpfDigits(input.cpf)

  const { data: existingActive } = await admin
    .from("profiles")
    .select("id")
    .or(`cpf.eq.${cpfOnlyDigits},email.eq.${input.email}`)
    .is("deleted_at", null)
    .maybeSingle()
  if (existingActive) {
    throw new Error("Já existe um usuário ativo com este e-mail ou CPF")
  }

  // A previously soft-deleted profile leaves its auth.users row behind
  // (see lib/administracao/store.tsx deleteUser), so re-approving the same
  // person must reuse/reactivate that auth user instead of creating a new
  // one — Supabase Auth rejects a duplicate email otherwise.
  const { data: existingDeleted } = await admin
    .from("profiles")
    .select("id")
    .or(`cpf.eq.${cpfOnlyDigits},email.eq.${input.email}`)
    .not("deleted_at", "is", null)
    .maybeSingle()

  let userId: string
  if (existingDeleted) {
    const { error: authError } = await admin.auth.admin.updateUserById(existingDeleted.id, {
      email: input.email,
      password: cpfOnlyDigits,
      email_confirm: true,
    })
    if (authError) throw new Error(authError.message)
    userId = existingDeleted.id
  } else {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: cpfOnlyDigits,
      email_confirm: true,
      user_metadata: { name: input.name },
    })
    if (authError || !authData.user) {
      throw new Error(authError?.message ?? "Não foi possível criar o usuário")
    }
    userId = authData.user.id
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      sector: input.sector,
      cpf: cpfOnlyDigits,
      role: input.role,
      status: "ACTIVE",
      is_sector_leader: false,
      deleted_at: null,
    })
    .select("*")
    .single()
  if (profileError || !profile) {
    if (!existingDeleted) await admin.auth.admin.deleteUser(userId)
    throw new Error(profileError?.message ?? "Não foi possível criar o perfil do usuário")
  }

  if (input.isSectorLeader) {
    await admin
      .from("profiles")
      .update({ is_sector_leader: false })
      .eq("sector", input.sector)
      .neq("id", profile.id)
      .is("deleted_at", null)
    await admin.from("profiles").update({ is_sector_leader: true }).eq("id", profile.id)
  }

  const user: AdminUser = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? "",
    sector: profile.sector,
    cpf: profile.cpf,
    role: profile.role,
    status: profile.status,
    isSectorLeader: input.isSectorLeader,
    createdAt: profile.created_at,
    deletedAt: profile.deleted_at,
  }

  let notified = true
  try {
    await sendWhatsAppText(
      toWhatsAppNumber(input.phone),
      `Olá, ${input.name}! ✅\n\nSeu acesso ao sistema Unipar-Cascavel foi liberado.\n\nE-mail: ${input.email}\nSenha: ${cpfOnlyDigits} (seu CPF, somente números)\n\nJá pode acessar o sistema.`
    )
  } catch {
    notified = false
  }

  return { user, notified }
}

export async function rejectAccessRequest(
  requestId: string,
  adminId: string
): Promise<{ notified: boolean }> {
  const admin = createAdminClient()

  const { data: requestRow, error } = await admin
    .from("access_requests")
    .update({
      status: "REJECTED",
      approved_by_id: adminId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "PENDING")
    .select("*")
    .single()
  if (error || !requestRow) {
    throw new Error(error?.message ?? "Solicitação não encontrada ou já processada")
  }

  let notified = true
  try {
    await sendWhatsAppText(
      toWhatsAppNumber(requestRow.phone),
      `Olá, ${requestRow.name}. Informamos que sua solicitação de acesso ao sistema Unipar-Cascavel foi rejeitada.\n\nEm caso de dúvidas, entre em contato com a administração.`
    )
  } catch {
    notified = false
  }

  return { notified }
}
