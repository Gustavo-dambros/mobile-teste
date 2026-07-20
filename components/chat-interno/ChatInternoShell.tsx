"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { MessageCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatInterno } from "@/lib/chat-interno/store"
import type { ChatMessage, ConversationKind } from "@/lib/chat-interno/types"
import { ConversationHeader } from "@/components/chat-interno/ConversationHeader"
import { ConversationList } from "@/components/chat-interno/ConversationList"
import { GroupInfoPanel } from "@/components/chat-interno/GroupInfoPanel"
import { MessageInput } from "@/components/chat-interno/MessageInput"
import { MessageList } from "@/components/chat-interno/MessageList"
import { MessageSearchPanel } from "@/components/chat-interno/MessageSearchPanel"
import { NewConversationDialog } from "@/components/chat-interno/NewConversationDialog"
import { NewGroupDialog } from "@/components/chat-interno/NewGroupDialog"
import { PinnedMessagesPanel } from "@/components/chat-interno/PinnedMessagesPanel"

export function ChatInternoShell({ scope }: { scope: ConversationKind }) {
  const { conversations, getConversation, startCall, getPinnedCount, setActiveConversationId: setStoreActiveConversationId } = useChatInterno()
  const searchParams = useSearchParams()
  const conversationIdParam = searchParams.get("conversationId")

  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)

  // Lets the store's notification-sound logic know which conversation is
  // currently open, so an incoming message for it doesn't play a redundant
  // sound while the user is already looking at it.
  React.useEffect(() => {
    setStoreActiveConversationId(activeConversationId)
    return () => setStoreActiveConversationId(null)
  }, [activeConversationId, setStoreActiveConversationId])

  // Deep-link entry point (e.g. "Bate-papo" from the Equipe page menu) —
  // opens straight into a specific conversation via ?conversationId=. Adjusting
  // state from a changed prop during render (React's blessed pattern for this,
  // see GuestMeetingFlow.tsx's wasAdmitted) instead of an effect+setState.
  const [lastConversationIdParam, setLastConversationIdParam] = React.useState(conversationIdParam)
  if (conversationIdParam !== lastConversationIdParam) {
    setLastConversationIdParam(conversationIdParam)
    if (conversationIdParam) setActiveConversationId(conversationIdParam)
  }
  const [newConversationOpen, setNewConversationOpen] = React.useState(false)
  const [newGroupOpen, setNewGroupOpen] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [pinsOpen, setPinsOpen] = React.useState(false)
  const [scrollToMessageId, setScrollToMessageId] = React.useState<string | null>(null)
  const [replyTo, setReplyTo] = React.useState<ChatMessage | null>(null)

  const activeConversation = activeConversationId ? getConversation(activeConversationId) : undefined

  function handleSelect(id: string) {
    setActiveConversationId(id)
    setReplyTo(null)
  }

  // Ringing/active call UI is owned globally by GlobalCallOverlay (mounted
  // in app/(app)/layout.tsx) so it survives navigating away from this page
  // — starting the call here is all this component still does.
  async function handleStartCall(kind: "audio" | "video") {
    if (!activeConversationId) return
    const result = await startCall(activeConversationId, kind)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível iniciar a chamada")
    }
  }

  function handleLeftGroup() {
    setActiveConversationId(null)
    setInfoOpen(false)
  }

  function handleJumpToMessage(messageId: string) {
    setSearchOpen(false)
    setPinsOpen(false)
    setScrollToMessageId(messageId)
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div
        className={cn(
          "w-full flex-col border-r md:flex md:w-80 lg:w-96",
          activeConversationId ? "hidden md:flex" : "flex"
        )}
      >
        <ConversationList
          scope={scope}
          activeConversationId={activeConversationId}
          onSelect={handleSelect}
          onNewConversation={() => setNewConversationOpen(true)}
          onNewGroup={() => setNewGroupOpen(true)}
        />
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 flex-col",
          activeConversationId ? "flex" : "hidden md:flex"
        )}
      >
        {activeConversation ? (
          <>
            <ConversationHeader
              conversation={activeConversation}
              onBack={() => setActiveConversationId(null)}
              onOpenInfo={() => setInfoOpen(true)}
              onStartCall={handleStartCall}
              onSearch={() => setSearchOpen(true)}
              onOpenPins={() => setPinsOpen(true)}
              pinnedCount={getPinnedCount(activeConversation.id)}
            />
            <MessageList
              conversationId={activeConversation.id}
              isGroup={activeConversation.kind === "group"}
              onReply={setReplyTo}
              scrollToMessageId={scrollToMessageId}
              onScrolledToMessage={() => setScrollToMessageId(null)}
            />
            <MessageInput
              conversationId={activeConversation.id}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageCircleIcon className="size-8" />
            <p className="text-sm">
              {conversations.filter((c) => c.kind === scope).length > 0
                ? "Selecione uma conversa para começar"
                : scope === "dm"
                  ? "Inicie uma nova conversa"
                  : "Crie um novo grupo"}
            </p>
          </div>
        )}
      </div>

      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onCreated={handleSelect}
      />
      <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} onCreated={handleSelect} />
      <GroupInfoPanel
        conversationId={activeConversationId}
        open={infoOpen}
        onOpenChange={setInfoOpen}
        onLeft={handleLeftGroup}
      />
      {activeConversationId && (
        <>
          <MessageSearchPanel
            conversationId={activeConversationId}
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onJumpToMessage={handleJumpToMessage}
          />
          <PinnedMessagesPanel
            conversationId={activeConversationId}
            open={pinsOpen}
            onOpenChange={setPinsOpen}
            onJumpToMessage={handleJumpToMessage}
          />
        </>
      )}
    </div>
  )
}
