import { NextResponse } from "next/server"
import { z } from "zod"

import { canChangeTaskStatus } from "@/lib/atividades-setor/permissions"
import { addHistory, mapTaskRow, notify, requireUser, TASK_SELECT } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({ status: z.enum(["pendente", "em_andamento", "concluida"]) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { status } = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: current } = await admin.from("activity_tasks").select(TASK_SELECT).eq("id", id).single()
    if (!current) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    if (!canChangeTaskStatus(user, { sector: current.sector, assigneeId: current.assignee_id })) {
      return NextResponse.json({ error: "Você não tem permissão para alterar o status desta tarefa" }, { status: 403 })
    }
    if (current.status === status) {
      return NextResponse.json({ task: mapTaskRow(current) })
    }

    const { data: task, error } = await admin
      .from("activity_tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(TASK_SELECT)
      .single()
    if (error || !task) throw new Error(error?.message ?? "Não foi possível alterar o status")

    await addHistory(admin, {
      entityType: "task",
      entityId: id,
      actorId: user.id,
      action: "status_changed",
      field: "status",
      oldValue: current.status,
      newValue: status,
    })

    const recipients = new Set([current.creator_id, ...(current.watcher_ids ?? [])])
    recipients.delete(user.id)
    const notifType = status === "concluida" ? "task_completed" : current.status === "concluida" ? "task_reopened" : "status_changed"
    const title = status === "concluida" ? "Tarefa concluída" : current.status === "concluida" ? "Tarefa reaberta" : "Status alterado"
    const message =
      status === "concluida"
        ? `A tarefa "${current.title}" foi marcada como concluída`
        : current.status === "concluida"
          ? `A tarefa "${current.title}" foi reaberta`
          : `A tarefa "${current.title}" mudou de status`
    await notify(
      admin,
      Array.from(recipients).map((uid) => ({
        type: notifType as "task_completed" | "task_reopened" | "status_changed",
        recipientUserId: uid,
        relatedType: "task" as const,
        relatedId: id,
        title,
        message,
      }))
    )

    return NextResponse.json({ task: mapTaskRow(task) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }
    if (error instanceof Error && error.name === "ActivitiesAuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 400 }
    )
  }
}
