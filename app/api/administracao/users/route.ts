import { NextResponse } from "next/server"
import { z } from "zod"

import { userRoleSchema } from "@/components/administracao/types"
import { AdminAuthError, createAuthUserAndProfile, requireAdmin } from "@/lib/administracao/server-actions"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  requestId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  sector: z.string().min(1),
  cpf: z.string().min(1),
  role: userRoleSchema,
  isSectorLeader: z.boolean(),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = bodySchema.parse(await request.json())

    const { user, notified } = await createAuthUserAndProfile(body)

    const adminClient = createAdminClient()
    await adminClient
      .from("access_requests")
      .update({
        status: "APPROVED",
        approved_by_id: admin.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", body.requestId)

    return NextResponse.json({ user, notified })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
