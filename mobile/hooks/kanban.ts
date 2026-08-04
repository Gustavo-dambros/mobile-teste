import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query"
import type { KanbanBoard, KanbanCard, KanbanColumn } from "@unipar/types"
import {
  fetchBoards,
  fetchColumns,
  fetchCards,
  createCard,
  updateCard,
  moveCard,
  completeCard,
  deleteCard,
  ApiAuthError,
} from "@unipar/api"

export const kanbanKeys = {
  all: ["kanban"] as const,
  boards: ["kanban", "boards"] as const,
  columns: (boardId: string) => ["kanban", "columns", boardId] as const,
  cards: (boardId: string) => ["kanban", "cards", boardId] as const,
}

// ── Boards ───────────────────────────────────────────────────────

export function useBoardsQuery(): UseQueryResult<KanbanBoard[], unknown> {
  return useQuery({
    queryKey: kanbanKeys.boards,
    queryFn: fetchBoards,
  })
}

// ── Columns ──────────────────────────────────────────────────────

export function useColumnsQuery(
  boardId: string | undefined
): UseQueryResult<KanbanColumn[], unknown> {
  return useQuery({
    queryKey: boardId ? kanbanKeys.columns(boardId) : ["kanban", "columns", undefined],
    queryFn: () => (boardId ? fetchColumns(boardId) : Promise.resolve([])),
    enabled: !!boardId,
  })
}

// ── Cards ────────────────────────────────────────────────────────

export function useCardsQuery(
  boardId: string | undefined
): UseQueryResult<KanbanCard[], unknown> {
  return useQuery({
    queryKey: boardId ? kanbanKeys.cards(boardId) : ["kanban", "cards", undefined],
    queryFn: () => (boardId ? fetchCards(boardId) : Promise.resolve([])),
    enabled: !!boardId,
  })
}

// ── Card mutations ────────────────────────────────────────────────

export type CreateCardInput = {
  columnId: string
  title: string
  description?: string
  priority?: string
}

export function useCreateCardMutation(): UseMutationResult<
  KanbanCard,
  unknown,
  { boardId: string; input: CreateCardInput }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input }) =>
      createCard(input.columnId, {
        title: input.title,
        description: input.description,
        priority: input.priority,
      }),
    onSuccess: (card, { boardId }) => {
      qc.setQueryData<KanbanCard[]>(kanbanKeys.cards(boardId), (old = []) => [...old, card])
    },
  })
}

export function useUpdateCardMutation(): UseMutationResult<
  KanbanCard,
  unknown,
  { id: string; data: Partial<KanbanCard>; boardId: string }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateCard(id, data),
    onSuccess: (card, { boardId }) => {
      qc.setQueryData<KanbanCard[]>(kanbanKeys.cards(boardId), (old = []) =>
        old.map((c) => (c.id === card.id ? card : c))
      )
    },
  })
}

export function useMoveCardMutation(): UseMutationResult<
  void,
  unknown,
  { id: string; columnId: string; position: number; boardId: string }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, columnId, position }) => moveCard(id, { columnId, position }),
    onSettled: (_d, _e, { boardId }) => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(boardId) })
    },
  })
}

export function useCompleteCardMutation(): UseMutationResult<
  void,
  unknown,
  { id: string; boardId: string }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }) => completeCard(id),
    onSettled: (_d, _e, { boardId }) => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(boardId) })
    },
  })
}

export function useDeleteCardMutation(): UseMutationResult<
  void,
  unknown,
  { id: string; boardId: string }
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }) => deleteCard(id),
    onSuccess: (_d, { id, boardId }) => {
      qc.setQueryData<KanbanCard[]>(kanbanKeys.cards(boardId), (old = []) =>
        old.filter((c) => c.id !== id)
      )
    },
  })
}

export { ApiAuthError }
