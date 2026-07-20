"use client"

import * as React from "react"

import { formatDateTime } from "@/lib/tickets/format"
import { useCurrentUser } from "@/lib/current-user/context"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanActivityLogEntry, KanbanCard } from "@/components/kanban/types"

function describeEntry(entry: KanbanActivityLogEntry, actorName: string): string {
  switch (entry.action) {
    case "card_created":
      return `${actorName} criou a atividade`
    case "title_changed":
      return `${actorName} alterou o título para "${entry.newValue}"`
    case "description_changed":
      return `${actorName} atualizou a descrição`
    case "priority_changed":
      return `${actorName} alterou a prioridade de ${entry.oldValue} para ${entry.newValue}`
    case "due_date_set":
      return `${actorName} definiu o prazo`
    case "due_date_changed":
      return `${actorName} alterou o prazo`
    case "due_date_removed":
      return `${actorName} removeu o prazo`
    case "moved_column":
      return `${actorName} moveu de "${entry.oldValue}" para "${entry.newValue}"`
    case "label_added":
      return `${actorName} adicionou a etiqueta "${entry.newValue}"`
    case "label_removed":
      return `${actorName} removeu a etiqueta "${entry.newValue}"`
    case "attachment_added":
      return `${actorName} anexou ${entry.newValue}`
    case "attachment_removed":
      return `${actorName} removeu o anexo ${entry.oldValue}`
    case "checklist_added":
      return `${actorName} adicionou um checklist`
    case "checklist_removed":
      return `${actorName} removeu um checklist`
    case "checklist_completed":
      return `${actorName} concluiu um checklist`
    case "comment_added":
      return `${actorName} comentou`
    case "comment_edited":
      return `${actorName} editou um comentário`
    case "comment_deleted":
      return `${actorName} excluiu um comentário`
    case "card_completed":
      return `${actorName} marcou a atividade como concluída`
    case "card_reopened":
      return `${actorName} reabriu a atividade`
    case "card_archived":
      return `${actorName} arquivou a atividade`
    case "card_restored":
      return `${actorName} restaurou a atividade`
    default:
      return `${actorName} atualizou a atividade`
  }
}

export function KanbanActivityHistory({ card }: { card: KanbanCard }) {
  const { loadActivityForCard, getActivityForCard } = useKanban()
  const currentUser = useCurrentUser()
  const entries = getActivityForCard(card.id)

  React.useEffect(() => {
    void loadActivityForCard(card.id)
  }, [card.id, loadActivityForCard])

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
  }

  return (
    <ol className="flex flex-col gap-2.5 border-l pl-3.5">
      {entries.map((entry) => (
        <li key={entry.id} className="relative text-sm">
          <span className="absolute top-1.5 -left-[1.1rem] size-1.5 rounded-full bg-border" aria-hidden />
          <p>{describeEntry(entry, currentUser?.name ?? "Alguém")}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
        </li>
      ))}
    </ol>
  )
}
