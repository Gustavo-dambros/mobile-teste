import { NextResponse } from "next/server"
import { z } from "zod"

import { userRoleSchema, userStatusSchema } from "@/components/administracao/types"
import { AdminAuthError, requireAdmin } from "@/lib/administracao/server-actions"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  sector: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  isSectorLeader: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const changes = bodySchema.parse(await request.json())

    const admin = createAdminClient()

    if (changes.email) {
      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        email: changes.email,
        email_confirm: true,
      })
      if (authError) throw new Error(authError.message)
    }

    if (changes.isSectorLeader && changes.sector) {
      await admin
        .from("profiles")
        .update({ is_sector_leader: false })
        .eq("sector", changes.sector)
        .neq("id", id)
        .is("deleted_at", null)
    }

    const payload: Record<string, unknown> = {}
    if (changes.name !== undefined) payload.name = changes.name
    if (changes.email !== undefined) payload.email = changes.email
    if (changes.sector !== undefined) payload.sector = changes.sector
    if (changes.phone !== undefined) payload.phone = changes.phone
    if (changes.role !== undefined) payload.role = changes.role
    if (changes.status !== undefined) payload.status = changes.status
    if (changes.isSectorLeader !== undefined) payload.is_sector_leader = changes.isSectorLeader

    const { data: profile, error } = await admin
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()
    if (error || !profile) throw new Error(error?.message ?? "Usuário não encontrado")

    return NextResponse.json({
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? "",
        sector: profile.sector,
        cpf: profile.cpf,
        role: profile.role,
        status: profile.status,
        isSectorLeader: profile.is_sector_leader,
        createdAt: profile.created_at,
        deletedAt: profile.deleted_at,
      },
    })
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
