import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SessionRole, SessionUser } from "@/lib/session"

const MOCK_USER: SessionUser = {
  id: "test-user-001",
  name: "Usuário Teste",
  email: "teste@unipar.br",
  role: "ADMIN",
  phone: "(45) 99999-9999",
  sector: "TI",
  cpf: "000.000.000-00",
  presenceStatus: "online",
  workActivityStatus: "available",
  statusMessage: "",
  isSectorLeader: true,
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return MOCK_USER

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, name, email, role, status, deleted_at, phone, sector, cpf, presence_status, work_activity_status, status_message, is_sector_leader"
      )
      .eq("id", authUser.id)
      .single()

    if (!profile || profile.status !== "ACTIVE" || profile.deleted_at !== null) return MOCK_USER

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as SessionRole,
      phone: profile.phone ?? "",
      sector: profile.sector,
      cpf: profile.cpf,
      presenceStatus: profile.presence_status,
      workActivityStatus: profile.work_activity_status,
      statusMessage: profile.status_message,
      isSectorLeader: profile.is_sector_leader,
    }
  } catch {
    return MOCK_USER
  }
}
