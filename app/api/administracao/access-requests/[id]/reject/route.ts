import { NextResponse } from "next/server"

import { AdminAuthError, rejectAccessRequest, requireAdmin } from "@/lib/administracao/server-actions"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    const { notified } = await rejectAccessRequest(id, admin.id)

    return NextResponse.json({ notified })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
