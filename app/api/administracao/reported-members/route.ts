import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/administracao/server-actions"
import { createAdminClient } from "@/lib/supabase/admin"

type Embed<T> = T | T[] | null
function one<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

interface ReportRow {
  id: string
  reason: string
  description: string | null
  created_at: string
  reporter: Embed<{ name: string }>
  reported: Embed<{ name: string; sector: string | null }>
}

export async function GET() {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("reported_members")
      .select(
        `
        id, reason, description, created_at,
        reporter:profiles!reported_members_reporter_id_fkey(name),
        reported:profiles!reported_members_reported_user_id_fkey(name, sector)
      `
      )
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)

    const reports = ((data ?? []) as unknown as ReportRow[]).map((row) => {
      const reporter = one(row.reporter)
      const reported = one(row.reported)
      return {
        id: row.id,
        reason: row.reason,
        description: row.description ?? undefined,
        createdAt: row.created_at,
        reporterName: reporter?.name ?? "",
        reportedName: reported?.name ?? "",
        reportedSector: reported?.sector ?? undefined,
      }
    })

    return NextResponse.json({ reports })
  } catch (error) {
    if (error instanceof Error && error.name === "AdminAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
