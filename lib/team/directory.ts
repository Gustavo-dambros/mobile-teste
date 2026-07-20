import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { ACTIVITY_LABEL, computePresenceLabel } from "@/lib/team/presence-labels"

export interface DirectoryMember {
  id: string
  name: string
  email: string
  phone: string
  sector: string
  role: "Admin" | "Usuário"
  presence: string
  activity: string
  isSectorLeader: boolean
}

export async function getTeamDirectory(): Promise<DirectoryMember[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, name, email, phone, sector, role, is_sector_leader, presence_status, work_activity_status, last_active_at"
    )
    .is("deleted_at", null)
    .eq("status", "ACTIVE")
    .order("name")

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    sector: row.sector,
    role: row.role === "ADMIN" ? "Admin" : "Usuário",
    presence: computePresenceLabel(row.presence_status, row.last_active_at),
    activity: ACTIVITY_LABEL[row.work_activity_status] ?? row.work_activity_status,
    isSectorLeader: row.is_sector_leader,
  }))
}
