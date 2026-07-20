import { NextResponse } from "next/server"
import { z } from "zod"

import { canEditTask, isSystemAdmin } from "@/lib/atividades-setor/permissions"
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
  priority: z.enum(["baixa", "media", "alta", "urgente"]),
  status: z.enum(["pendente", "em_andamento", "concluida"]),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  watcherIds: z.array(z.string()).default([]),
  isPriority: z.boolean().default(false),
  attachments: z.array(z.any()).default([]),
  recurrence: z.any().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const input = bodySchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: current } = await admin.from("activity_tasks").select(TASK_SELECT).eq("id", id).single()
    if (!current) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    if (!canEditTask(user, { creatorId: current.creator_id })) {
      return NextResponse.json({ error: "Você não tem permissão para editar esta tarefa" }, { status: 403 })
    }
    if (!isSystemAdmin(user) && input.sector !== user.sector) {
      return NextResponse.json(
        { error: "Você só pode mover a tarefa para o seu próprio setor" },
        { status: 403 }
      )
    }
    if (input.assigneeId !== current.assignee_id) {
      await assertActiveProfile(admin, input.assigneeId)
    }

    const historyEntries: { action: import("@/components/atividades-setor/types").HistoryAction; field?: string; oldValue?: string; newValue?: string }[] = []
    if (input.title !== current.title) {
      historyEntries.push({ action: "title_changed", field: "title", oldValue: current.title, newValue: input.title })
    }
    if (input.description !== current.description) historyEntries.push({ action: "description_changed" })
    if (input.assigneeId !== current.assignee_id) {
      historyEntries.push({ action: "assignee_changed", field: "assigneeId" })
    }
    if (input.dueDate !== (current.due_date ?? undefined) || input.dueTime !== (current.due_time ?? undefined)) {
      historyEntries.push({ action: "due_date_changed", field: "dueDate", oldValue: current.due_date ?? undefined, newValue: input.dueDate })
    }
    if (input.priority !== current.priority) historyEntries.push({ action: "priority_changed" })
    if (input.status !== current.status) {
      historyEntries.push({ action: "status_changed", field: "status", oldValue: current.status, newValue: input.status })
    }

    const { data: task, error } = await admin
      .from("activity_tasks")
      .update({
        title: input.title,
        description: input.description,
        sector: input.sector,
        assignee_id: input.assigneeId,
        watcher_ids: input.watcherIds,
        start_date: input.startDate,
        due_date: input.dueDate,
        due_time: input.dueTime,
        status: input.status,
        priority: input.priority,
        is_priority: input.isPriority,
        category: input.category,
        tags: input.tags,
        recurrence: input.recurrence,
        attachments: input.attachments,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(TASK_SELECT)
      .single()
    if (error || !task) throw new Error(error?.message ?? "Não foi possível salvar a tarefa")

    for (const entry of historyEntries) {
      await addHistory(admin, { entityType: "task", entityId: id, actorId: user.id, ...entry })
    }

    if (input.assigneeId !== current.assignee_id) {
      await notify(admin, [
        {
          type: "assignee_changed",
          recipientUserId: input.assigneeId,
          relatedType: "task",
          relatedId: id,
          title: "Você foi atribuído a uma tarefa",
          message: `Você agora é responsável pela tarefa "${input.title}"`,
        },
      ])
    }
    if (input.dueDate !== (current.due_date ?? undefined) || input.dueTime !== (current.due_time ?? undefined)) {
      await notify(admin, [
        {
          type: "due_date_changed",
          recipientUserId: input.assigneeId,
          relatedType: "task",
          relatedId: id,
          title: "Prazo alterado",
          message: `O prazo da tarefa "${input.title}" foi alterado`,
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
