import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ACTIVITY_LABEL, computePresenceLabel } from "@/lib/team/presence-labels"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sector = searchParams.get("sector")

  const admin = createAdminClient()

  let query = admin
    .from("profiles")
    .select("id, name, email, phone, sector, role, is_sector_leader, presence_status, work_activity_status, last_active_at")
    .is("deleted_at", null)
    .eq("status", "ACTIVE")

  if (sector) {
    query = query.eq("sector", sector)
  }

  let { data, error } = await query.order("name")

  // If sector filter returned no results, fetch all members
  if (sector && (!data || data.length === 0)) {
    const fallback = await admin
      .from("profiles")
      .select("id, name, email, phone, sector, role, is_sector_leader, presence_status, work_activity_status, last_active_at")
      .is("deleted_at", null)
      .eq("status", "ACTIVE")
      .order("name")

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const members = (data ?? []).map((row) => ({
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

  return NextResponse.json(members)
}
