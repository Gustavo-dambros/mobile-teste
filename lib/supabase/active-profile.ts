import "server-only"

import type { createAdminClient } from "@/lib/supabase/admin"

export class InactiveProfileError extends Error {
  constructor(message = "Colaborador não encontrado ou inativo") {
    super(message)
    this.name = "InactiveProfileError"
  }
}

/** Guards any write that targets a profile by id (assignee, responsible, new
 * member, …) — without this, a deleted/anonymized user's id can still be
 * accepted since the picker that normally filters them out only runs client-side. */
export async function assertActiveProfile(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("id", id)
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .maybeSingle()
  if (!data) throw new InactiveProfileError()
}

/** Same guard for a batch of ids — throws on the first inactive one. */
export async function assertActiveProfiles(admin: ReturnType<typeof createAdminClient>, ids: string[]) {
  if (ids.length === 0) return
  const unique = [...new Set(ids)]
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("id", unique)
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
  const activeIds = new Set((data ?? []).map((row) => row.id as string))
  if (unique.some((id) => !activeIds.has(id))) {
    throw new InactiveProfileError()
  }
}
