import type {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanLabel,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanComment,
} from "@unipar/types"
import { apiFetch } from "./api-fetch"

// ── Boards ───────────────────────────────────────────────────────

export async function fetchBoards(): Promise<KanbanBoard[]> {
  return apiFetch<KanbanBoard[]>("/api/kanban/boards")
}

export async function createBoard(data: {
  title: string
  description?: string
  backgroundValue: string
  isDefault?: boolean
}): Promise<KanbanBoard> {
  return apiFetch<KanbanBoard>("/api/kanban/boards", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateBoard(
  id: string,
  data: Partial<KanbanBoard>
): Promise<KanbanBoard> {
  return apiFetch<KanbanBoard>(`/api/kanban/boards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteBoard(id: string): Promise<void> {
  await apiFetch(`/api/kanban/boards/${id}`, { method: "DELETE" })
}

export async function duplicateBoard(id: string): Promise<KanbanBoard> {
  return apiFetch<KanbanBoard>(`/api/kanban/boards/${id}/duplicate`, { method: "POST" })
}

export async function archiveBoard(id: string): Promise<void> {
  await apiFetch(`/api/kanban/boards/${id}/archive`, { method: "POST" })
}

// ── Columns ──────────────────────────────────────────────────────

export async function fetchColumns(boardId: string): Promise<KanbanColumn[]> {
  return apiFetch<KanbanColumn[]>(`/api/kanban/boards/${boardId}/columns`)
}

export async function createColumn(
  boardId: string,
  data: { title: string; color?: string }
): Promise<KanbanColumn> {
  return apiFetch<KanbanColumn>(`/api/kanban/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateColumn(
  id: string,
  data: { title?: string; color?: string | null; isDoneColumn?: boolean }
): Promise<KanbanColumn> {
  return apiFetch<KanbanColumn>(`/api/kanban/columns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteColumn(id: string): Promise<void> {
  await apiFetch(`/api/kanban/columns/${id}`, { method: "DELETE" })
}

export async function duplicateColumn(id: string): Promise<KanbanColumn> {
  return apiFetch<KanbanColumn>(`/api/kanban/columns/${id}/duplicate`, { method: "POST" })
}

export async function archiveColumn(id: string): Promise<void> {
  await apiFetch(`/api/kanban/columns/${id}/archive`, { method: "POST" })
}

export async function moveColumn(id: string, position: number): Promise<void> {
  await apiFetch(`/api/kanban/columns/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ position }),
  })
}

// ── Cards ────────────────────────────────────────────────────────

export async function fetchCards(boardId: string): Promise<KanbanCard[]> {
  return apiFetch<KanbanCard[]>(`/api/kanban/boards/${boardId}/cards`)
}

export async function createCard(
  columnId: string,
  data: { title: string; description?: string; priority?: string }
): Promise<KanbanCard> {
  return apiFetch<KanbanCard>(`/api/kanban/columns/${columnId}/cards`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCard(
  id: string,
  data: Partial<KanbanCard>
): Promise<KanbanCard> {
  return apiFetch<KanbanCard>(`/api/kanban/cards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteCard(id: string): Promise<void> {
  await apiFetch(`/api/kanban/cards/${id}`, { method: "DELETE" })
}

export async function moveCard(
  id: string,
  data: { columnId: string; position: number }
): Promise<void> {
  await apiFetch(`/api/kanban/cards/${id}/move`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function duplicateCard(id: string): Promise<KanbanCard> {
  return apiFetch<KanbanCard>(`/api/kanban/cards/${id}/duplicate`, { method: "POST" })
}

export async function completeCard(id: string): Promise<void> {
  await apiFetch(`/api/kanban/cards/${id}/complete`, { method: "POST" })
}

export async function archiveCard(id: string): Promise<void> {
  await apiFetch(`/api/kanban/cards/${id}/archive`, { method: "POST" })
}

// ── Labels ───────────────────────────────────────────────────────

export async function fetchLabels(): Promise<KanbanLabel[]> {
  return apiFetch<KanbanLabel[]>("/api/kanban/labels")
}

export async function createLabel(data: {
  name: string
  color: string
}): Promise<KanbanLabel> {
  return apiFetch<KanbanLabel>("/api/kanban/labels", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateLabel(
  id: string,
  data: { name?: string; color?: string }
): Promise<KanbanLabel> {
  return apiFetch<KanbanLabel>(`/api/kanban/labels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteLabel(id: string): Promise<void> {
  await apiFetch(`/api/kanban/labels/${id}`, { method: "DELETE" })
}

// ── Checklists ───────────────────────────────────────────────────

export async function fetchChecklists(cardId: string): Promise<KanbanChecklist[]> {
  return apiFetch<KanbanChecklist[]>(`/api/kanban/cards/${cardId}/checklists`)
}

export async function createChecklist(
  cardId: string,
  title: string
): Promise<KanbanChecklist> {
  return apiFetch<KanbanChecklist>(`/api/kanban/cards/${cardId}/checklists`, {
    method: "POST",
    body: JSON.stringify({ title }),
  })
}

export async function updateChecklist(
  id: string,
  title: string
): Promise<KanbanChecklist> {
  return apiFetch<KanbanChecklist>(`/api/kanban/checklists/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  })
}

export async function deleteChecklist(id: string): Promise<void> {
  await apiFetch(`/api/kanban/checklists/${id}`, { method: "DELETE" })
}

export async function fetchChecklistItems(
  checklistId: string
): Promise<KanbanChecklistItem[]> {
  return apiFetch<KanbanChecklistItem[]>(`/api/kanban/checklists/${checklistId}/items`)
}

export async function createChecklistItem(
  checklistId: string,
  title: string
): Promise<KanbanChecklistItem> {
  return apiFetch<KanbanChecklistItem>(`/api/kanban/checklists/${checklistId}/items`, {
    method: "POST",
    body: JSON.stringify({ title }),
  })
}

export async function updateChecklistItem(
  id: string,
  data: { title?: string; isCompleted?: boolean }
): Promise<KanbanChecklistItem> {
  return apiFetch<KanbanChecklistItem>(`/api/kanban/checklist-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await apiFetch(`/api/kanban/checklist-items/${id}`, { method: "DELETE" })
}

// ── Comments ─────────────────────────────────────────────────────

export async function fetchComments(cardId: string): Promise<KanbanComment[]> {
  return apiFetch<KanbanComment[]>(`/api/kanban/cards/${cardId}/comments`)
}

export async function addComment(
  cardId: string,
  content: string
): Promise<KanbanComment> {
  return apiFetch<KanbanComment>(`/api/kanban/cards/${cardId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

export async function updateComment(
  id: string,
  content: string
): Promise<KanbanComment> {
  return apiFetch<KanbanComment>(`/api/kanban/comments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  })
}

export async function deleteComment(id: string): Promise<void> {
  await apiFetch(`/api/kanban/comments/${id}`, { method: "DELETE" })
}

// ── Attachments ──────────────────────────────────────────────────

export async function deleteAttachment(id: string): Promise<void> {
  await apiFetch(`/api/kanban/attachments/${id}`, { method: "DELETE" })
}
