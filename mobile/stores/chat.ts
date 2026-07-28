import { create } from "zustand"
import type { Conversation } from "@unipar/types"

interface ChatState {
  conversations: Conversation[]
  selectedConversationId: string | null
  unreadCount: number
  isLoading: boolean
  setConversations: (conversations: Conversation[]) => void
  setSelectedConversation: (id: string | null) => void
  setUnreadCount: (count: number) => void
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  unreadCount: 0,
  isLoading: false,
  setConversations: (conversations) => set({ conversations }),
  setSelectedConversation: (selectedConversationId) => set({ selectedConversationId }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setLoading: (isLoading) => set({ isLoading }),
}))
