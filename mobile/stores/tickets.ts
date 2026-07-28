import { create } from "zustand"
import type { Ticket } from "@unipar/types"

interface TicketsState {
  tickets: Ticket[]
  selectedTicketId: string | null
  isLoading: boolean
  setTickets: (tickets: Ticket[]) => void
  addTicket: (ticket: Ticket) => void
  updateTicket: (id: string, data: Partial<Ticket>) => void
  setSelectedTicket: (id: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useTicketsStore = create<TicketsState>((set) => ({
  tickets: [],
  selectedTicketId: null,
  isLoading: false,
  setTickets: (tickets) => set({ tickets }),
  addTicket: (ticket) => set((state) => ({ tickets: [ticket, ...state.tickets] })),
  updateTicket: (id, data) =>
    set((state) => ({
      tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),
  setSelectedTicket: (selectedTicketId) => set({ selectedTicketId }),
  setLoading: (isLoading) => set({ isLoading }),
}))
