"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  PlusIcon,
  UserPlusIcon,
  UsersRoundIcon,
  HeadsetIcon,
  SearchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatInterno } from "@/lib/chat-interno/store"
import type { ChatMessage, ConversationKind } from "@/lib/chat-interno/types"
import { ConversationHeader } from "@/components/chat-interno/ConversationHeader"
import { ConversationList } from "@/components/chat-interno/ConversationList"
import { MessageInput } from "@/components/chat-interno/MessageInput"
import { MessageList } from "@/components/chat-interno/MessageList"
import { NewConversationDialog } from "@/components/chat-interno/NewConversationDialog"
import { NewGroupDialog } from "@/components/chat-interno/NewGroupDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type FilterTab = "dm" | "group"

const tabs: { id: FilterTab; label: string }[] = [
  { id: "dm", label: "Conversa Direta" },
  { id: "group", label: "Grupo" },
]

export default function ComunicacaoPage() {
  const router = useRouter()
  const { getConversation, startCall } = useChatInterno()
  const [activeTab, setActiveTab] = React.useState<FilterTab>("dm")
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [showNewOptions, setShowNewOptions] = React.useState(false)
  const [newConversationOpen, setNewConversationOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [newGroupOpen, setNewGroupOpen] = React.useState(false)
  const [replyTo, setReplyTo] = React.useState<ChatMessage | null>(null)

  const activeConversation = activeConversationId ? getConversation(activeConversationId) : undefined

  function handleSelect(id: string) {
    setActiveConversationId(id)
    setReplyTo(null)
  }

  async function handleStartCall(kind: "audio" | "video") {
    if (!activeConversationId) return
    const result = await startCall(activeConversationId, kind)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível iniciar a chamada")
    }
  }

  if (activeConversation) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <ConversationHeader
          conversation={activeConversation}
          onBack={() => setActiveConversationId(null)}
          onOpenInfo={() => {}}
          onStartCall={handleStartCall}
          onSearch={() => {}}
          onOpenPins={() => {}}
          pinnedCount={0}
        />
        <div className="flex flex-1 flex-col overflow-hidden pb-16">
          <MessageList
            conversationId={activeConversation.id}
            isGroup={activeConversation.kind === "group"}
            onReply={setReplyTo}
            scrollToMessageId={null}
            onScrolledToMessage={() => {}}
          />
        </div>
        <MessageInput
          conversationId={activeConversation.id}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-15 items-center gap-3 border-b border-border px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 text-base font-semibold">Comunicação</h1>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowNewOptions(true)}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-2 border-b border-border">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pb-16">
        <ConversationList
          scope={activeTab}
          activeConversationId={activeConversationId}
          onSelect={handleSelect}
          onNewConversation={() => setShowNewOptions(true)}
          onNewGroup={() => setShowNewOptions(true)}
          hideHeader
          externalSearch={search}
        />
      </div>

      <Dialog open={showNewOptions} onOpenChange={setShowNewOptions}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <button
              onClick={() => {
                setShowNewOptions(false)
                setNewConversationOpen(true)
              }}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserPlusIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Conversa direta</p>
                <p className="text-xs text-muted-foreground">Iniciar uma conversa com alguém</p>
              </div>
            </button>
            <button
              onClick={() => {
                setShowNewOptions(false)
                setNewGroupOpen(true)
              }}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UsersRoundIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Criar grupo</p>
                <p className="text-xs text-muted-foreground">Criar um novo grupo</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onCreated={handleSelect}
      />
      <NewGroupDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        onCreated={handleSelect}
      />
    </div>
  )
}
