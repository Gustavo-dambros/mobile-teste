import { create } from "zustand"
import type { KanbanBoard, KanbanColumn, KanbanCard } from "@unipar/types"

interface KanbanState {
  boards: KanbanBoard[]
  selectedBoardId: string | null
  columns: KanbanColumn[]
  cards: KanbanCard[]
  isLoading: boolean
  setBoards: (boards: KanbanBoard[]) => void
  setSelectedBoard: (id: string | null) => void
  setColumns: (columns: KanbanColumn[]) => void
  setCards: (cards: KanbanCard[]) => void
  updateCard: (id: string, data: Partial<KanbanCard>) => void
  moveCard: (id: string, columnId: string, position: number) => void
  setLoading: (loading: boolean) => void
}

export const useKanbanStore = create<KanbanState>((set) => ({
  boards: [],
  selectedBoardId: null,
  columns: [],
  cards: [],
  isLoading: false,
  setBoards: (boards) => set({ boards }),
  setSelectedBoard: (selectedBoardId) => set({ selectedBoardId }),
  setColumns: (columns) => set({ columns }),
  setCards: (cards) => set({ cards }),
  updateCard: (id, data) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),
  moveCard: (id, columnId, position) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, columnId, position } : c
      ),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}))
