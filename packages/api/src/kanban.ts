import type {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanLabel,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanComment,
} from "@unipar/types"

const API_BASE = "/api"

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

// ── Boards ───────────────────────────────────────────────────────

export async function fetchBoards(): Promise<KanbanBoard[]> {
  return apiFetch<KanbanBoard[]>("/kanban/boards")
}

export async function createBoard(data: {
  title: string
  description?: string
  backgroundType: string
  backgroundValue: string
}): Promise<KanbanBoard> {
  return apiFetch<KanbanBoard>("/kanban/boards", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateBoard(
  id: string,
  data: Partial<KanbanBoard>
): Promise<KanbanBoard> {
  return apiFetch<KanbanBoard>(`/kanban/boards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteBoard(id: string): Promise<void> {
  await apiFetch(`/kanban/boards/${id}`, { method: "DELETE" })
}

// ── Columns ──────────────────────────────────────────────────────

export async function fetchColumns(boardId: string): Promise<KanbanColumn[]> {
  return apiFetch<KanbanColumn[]>(`/kanban/boards/${boardId}/columns`)
}

export async function createColumn(
  boardId: string,
  data: { title: string; color?: string }
): Promise<KanbanColumn> {
  return apiFetch<KanbanColumn>(`/kanban/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ── Cards ────────────────────────────────────────────────────────

export async function fetchCards(boardId: string): Promise<KanbanCard[]> {
  return apiFetch<KanbanCard[]>(`/kanban/boards/${boardId}/cards`)
}

export async function createCard(
  columnId: string,
  data: { title: string; description?: string; priority?: string }
): Promise<KanbanCard> {
  return apiFetch<KanbanCard>(`/kanban/columns/${columnId}/cards`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCard(
  id: string,
  data: Partial<KanbanCard>
): Promise<KanbanCard> {
  return apiFetch<KanbanCard>(`/kanban/cards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function moveCard(
  id: string,
  data: { columnId: string; position: number }
): Promise<void> {
  await apiFetch(`/kanban/cards/${id}/move`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ── Labels ───────────────────────────────────────────────────────

export async function fetchLabels(): Promise<KanbanLabel[]> {
  return apiFetch<KanbanLabel[]>("/kanban/labels")
}

export async function createLabel(data: {
  name: string
  color: string
}): Promise<KanbanLabel> {
  return apiFetch<KanbanLabel>("/kanban/labels", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ── Checklists ───────────────────────────────────────────────────

export async function fetchChecklists(cardId: string): Promise<KanbanChecklist[]> {
  return apiFetch<KanbanChecklist[]>(`/kanban/cards/${cardId}/checklists`)
}

export async function fetchChecklistItems(
  checklistId: string
): Promise<KanbanChecklistItem[]> {
  return apiFetch<KanbanChecklistItem[]>(`/kanban/checklists/${checklistId}/items`)
}

// ── Comments ─────────────────────────────────────────────────────

export async function fetchComments(cardId: string): Promise<KanbanComment[]> {
  return apiFetch<KanbanComment[]>(`/kanban/cards/${cardId}/comments`)
}

export async function addComment(
  cardId: string,
  content: string
): Promise<KanbanComment> {
  return apiFetch<KanbanComment>(`/kanban/cards/${cardId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}
