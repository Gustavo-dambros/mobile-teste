"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { cardsContainer, listItem } from "@/lib/motion"
import { formatTime, isSameDay } from "@/lib/tickets/format"
import { useChatInterno } from "@/lib/chat-interno/store"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import type { Conversation, ConversationKind } from "@/lib/chat-interno/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function conversationTitle(conversation: Conversation, rosterById: Map<string, { name: string }>) {
  if (conversation.kind === "group") return conversation.name ?? "Grupo"
  return rosterById.get(conversation.memberIds[0])?.name ?? "Contato"
}

function attachmentPreviewLabel(kind: string) {
  if (kind === "image") return "📷 Foto"
  if (kind === "video") return "🎥 Vídeo"
  if (kind === "audio") return "🎤 Mensagem de voz"
  return "📎 Arquivo"
}

export function ConversationList({
  scope,
  activeConversationId,
  onSelect,
  onNewConversation,
  onNewGroup,
  hideHeader = false,
  externalSearch,
}: {
  scope: ConversationKind
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNewConversation: () => void
  onNewGroup: () => void
  hideHeader?: boolean
  externalSearch?: string
}) {
  const reduced = useReducedMotion()
  const { conversations, getMessagesFor, getUnreadCount, hasUnread } = useChatInterno()
  const roster = useChatRoster()
  const rosterById = React.useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster])
  const [internalSearch, setInternalSearch] = React.useState("")
  const search = externalSearch ?? internalSearch

  const items = conversations
    .filter((c) => c.kind === scope && !c.leftAt)
    .map((conversation) => {
      const messages = getMessagesFor(conversation.id)
      const lastMessage = messages.at(-1)
      return { conversation, lastMessage }
    })
    .filter(({ conversation }) =>
      conversationTitle(conversation, rosterById).toLowerCase().includes(search.trim().toLowerCase())
    )
    .sort((a, b) => {
      const aAt = a.lastMessage?.createdAt ?? a.conversation.createdAt
      const bAt = b.lastMessage?.createdAt ?? b.conversation.createdAt
      return bAt.localeCompare(aAt)
    })

  return (
    <div className="flex h-full flex-col">
      {!hideHeader && (
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={externalSearch ?? internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="Buscar conversa"
              className="pl-8"
            />
          </div>
          {scope === "dm" ? (
            <Button type="button" size="icon" variant="outline" onClick={onNewConversation}>
              <PlusIcon />
              <span className="sr-only">Nova conversa</span>
            </Button>
          ) : (
            <Button type="button" size="icon" variant="outline" onClick={onNewGroup}>
              <UsersIcon />
              <span className="sr-only">Novo grupo</span>
            </Button>
          )}
        </div>
      )}

      <motion.div
        variants={cardsContainer(reduced, 0.05)}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col overflow-y-auto"
      >
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            {scope === "dm" ? "Nenhuma conversa ainda." : "Nenhum grupo ainda."}
          </div>
        ) : (
          items.map(({ conversation, lastMessage }) => {
            const title = conversationTitle(conversation, rosterById)
            const unread = hasUnread(conversation.id)
            const unreadCount = getUnreadCount(conversation.id)
            const preview = lastMessage
              ? lastMessage.deletedForEveryone
                ? "Mensagem apagada"
                : lastMessage.kind === "system"
                  ? lastMessage.text
                  : lastMessage.text || attachmentPreviewLabel(lastMessage.attachments[0]?.kind ?? "document")
              : "Nenhuma mensagem ainda"
            const timeLabel = lastMessage
              ? isSameDay(new Date(lastMessage.createdAt), new Date())
                ? formatTime(lastMessage.createdAt)
                : new Date(lastMessage.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
              : ""

            return (
              <motion.button
                key={conversation.id}
                type="button"
                variants={listItem(reduced)}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "flex items-center gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                  activeConversationId === conversation.id && "bg-muted"
                )}
              >
                <Avatar size="lg" className="shrink-0">
                  <AvatarFallback>{initials(title)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-xs", unread ? "text-foreground" : "text-muted-foreground")}>
                      {preview}
                    </span>
                    {unread && unreadCount > 0 && (
                      <Badge className="size-5 shrink-0 rounded-full px-1 tabular-nums">{unreadCount}</Badge>
                    )}
                  </div>
                </div>
              </motion.button>
            )
          })
        )}
      </motion.div>
    </div>
  )
}
