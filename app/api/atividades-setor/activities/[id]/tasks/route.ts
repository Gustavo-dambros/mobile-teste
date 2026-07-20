import { NextResponse } from "next/server"
import { z } from "zod"

import { canEditEvent, isSystemAdmin } from "@/lib/atividades-setor/permissions"
import { addHistory, mapTaskRow, notify, requireUser, TASK_SELECT } from "@/lib/atividades-setor/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertActiveProfile, InactiveProfileError } from "@/lib/supabase/active-profile"

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  sector: z.string().min(1),
  assigneeId: z.string(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
  status: z.enum(["pendente", "em_andamento", "concluida"]).default("pendente"),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  watcherIds: z.array(z.string()).default([]),
  isPriority: z.boolean().default(false),
  notifyAssignee: z.boolean().default(true),
  attachments: z.array(z.any()).default([]),
  recurrence: z.any().optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const input = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: activity } = await admin.from("activities").select("creator_id").eq("id", id).single()
    if (!activity) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 })
    if (!canEditEvent(user, { creatorId: activity.creator_id })) {
      return NextResponse.json({ error: "Você não tem permissão para adicionar tarefas nesta atividade" }, { status: 403 })
    }
    if (!isSystemAdmin(user) && input.sector !== user.sector) {
      return NextResponse.json(
        { error: "Você só pode criar tarefas para o seu próprio setor" },
        { status: 403 }
      )
    }
    await assertActiveProfile(admin, input.assigneeId)

    const { data: task, error } = await admin
      .from("activity_tasks")
      .insert({
        title: input.title,
        description: input.description,
        sector: input.sector,
        creator_id: user.id,
        assignee_id: input.assigneeId,
        watcher_ids: input.watcherIds,
        activity_id: id,
        start_date: input.startDate,
        due_date: input.dueDate,
        due_time: input.dueTime,
        priority: input.priority,
        status: input.status,
        is_priority: input.isPriority,
        category: input.category,
        tags: input.tags,
        recurrence: input.recurrence,
        attachments: input.attachments,
      })
      .select(TASK_SELECT)
      .single()
    if (error || !task) throw new Error(error?.message ?? "Não foi possível criar a tarefa")

    await addHistory(admin, { entityType: "task", entityId: task.id, actorId: user.id, action: "task_created" })

    if (input.notifyAssignee && input.assigneeId !== user.id) {
      await notify(admin, [
        {
          type: "task_assigned",
          recipientUserId: input.assigneeId,
          relatedType: "task",
          relatedId: task.id,
          title: "Nova tarefa atribuída",
          message: `${user.name} atribuiu a você a tarefa "${input.title}"`,
        },
      ])
    }

    return NextResponse.json({ task: mapTaskRow(task) })
  } catch (error) {
    if (error instanceof InactiveProfileError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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
