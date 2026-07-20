"use client"

import * as React from "react"
import { toast } from "sonner"
import { motion, useReducedMotion } from "motion/react"
import { PhoneIcon, PhoneMissedIcon, VideoIcon } from "lucide-react"

import { messageBubble } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { formatDaySeparator, formatTime, isSameDay, isWithinEditWindow } from "@/lib/tickets/format"
import { useChatInterno } from "@/lib/chat-interno/store"
import type { ChatMessage } from "@/lib/chat-interno/types"
import { MessageBubble } from "@/components/chat-interno/MessageBubble"
import { TypingIndicator } from "@/components/chat-interno/TypingIndicator"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

function DateSeparator({ iso }: { iso: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div variants={messageBubble(reduced)} initial="hidden" animate="show" className="flex justify-center py-2">
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
        {formatDaySeparator(iso)}
      </span>
    </motion.div>
  )
}

function CallLogRow({ message }: { message: ChatMessage }) {
  const reduced = useReducedMotion()
  const meta = message.systemMeta
  const missed = meta?.callOutcome === "missed" || meta?.callOutcome === "declined"
  const Icon = meta?.callKind === "video" ? VideoIcon : missed ? PhoneMissedIcon : PhoneIcon
  const durationLabel =
    meta?.durationSeconds && meta.durationSeconds >= 1
      ? ` • ${Math.floor(meta.durationSeconds / 60)}:${String(Math.round(meta.durationSeconds % 60)).padStart(2, "0")}`
      : ""

  return (
    <motion.div variants={messageBubble(reduced)} initial="hidden" animate="show" className="flex justify-center py-1">
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
          missed ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-muted/60 text-foreground/80"
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        {message.text}
        {durationLabel}
        <span className="text-muted-foreground">· {formatTime(message.createdAt)}</span>
      </span>
    </motion.div>
  )
}

function SystemMessageRow({ message }: { message: ChatMessage }) {
  const reduced = useReducedMotion()
  if (message.systemEvent === "call_log") return <CallLogRow message={message} />
  return (
    <motion.div variants={messageBubble(reduced)} initial="hidden" animate="show" className="flex justify-center py-1.5">
      <span className="rounded-lg border bg-muted/40 px-3 py-1.5 text-center text-xs font-medium text-foreground/70">
        {message.text}
      </span>
    </motion.div>
  )
}

export function MessageList({
  conversationId,
  isGroup,
  onReply,
  scrollToMessageId,
  onScrolledToMessage,
}: {
  conversationId: string
  isGroup: boolean
  onReply: (message: ChatMessage) => void
  scrollToMessageId?: string | null
  onScrolledToMessage?: () => void
}) {
  const {
    getMessagesFor,
    loadMessages,
    getMessage,
    editMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    toggleReaction,
    markConversationSeen,
    typing,
    isPinned,
    pinMessage,
    unpinMessage,
  } = useChatInterno()

  const messages = getMessagesFor(conversationId)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingText, setEditingText] = React.useState("")
  const [tickNow, setTickNow] = React.useState(() => Date.now())
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null)

  // Without this, the message cache for this conversation is never
  // populated: getMessagesFor() always returns [], and sending a message
  // silently drops it locally (mergeMessage only merges into an
  // already-loaded list) — the message reaches the server but never
  // appears on screen.
  React.useEffect(() => {
    loadMessages(conversationId)
  }, [conversationId, loadMessages])

  React.useEffect(() => {
    const interval = window.setInterval(() => loadMessages(conversationId), 12_000)
    return () => window.clearInterval(interval)
  }, [conversationId, loadMessages])

  React.useEffect(() => {
    markConversationSeen(conversationId)
  }, [conversationId, messages.length, markConversationSeen])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length, conversationId])

  // Jump-to-message from search: runs after the above scroll-to-bottom effect
  // since it depends on scrollToMessageId, which only changes on demand.
  React.useEffect(() => {
    if (!scrollToMessageId) return
    const el = document.getElementById(`chat-message-${scrollToMessageId}`)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlightedId(scrollToMessageId)
    onScrolledToMessage?.()
    const timeout = window.setTimeout(() => setHighlightedId(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [scrollToMessageId, onScrolledToMessage])

  React.useEffect(() => {
    const interval = window.setInterval(() => setTickNow(Date.now()), 500)
    return () => window.clearInterval(interval)
  }, [])

  const typingMembers = typing.filter((t) => t.conversationId === conversationId && t.expiresAt > tickNow)

  function startEdit(message: ChatMessage) {
    setEditingId(message.id)
    setEditingText(message.text)
  }
  async function saveEdit() {
    if (!editingId) return
    const result = await editMessage(conversationId, editingId, editingText)
    if (!result.ok) toast.error(result.error ?? "Não foi possível editar a mensagem")
    setEditingId(null)
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("Mensagem copiada")
  }

  return (
    <div ref={scrollRef} className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-3">
      {messages.map((message, index) => {
        const previous = messages[index - 1]
        const showDateSeparator = !previous || !isSameDay(new Date(previous.createdAt), new Date(message.createdAt))
        const replyToMessage = message.replyToId ? getMessage(conversationId, message.replyToId) : undefined

        return (
          <React.Fragment key={message.id}>
            {showDateSeparator && <DateSeparator iso={message.createdAt} />}
            <div
              id={`chat-message-${message.id}`}
              className={cn(
                "rounded-lg transition-colors duration-1000",
                highlightedId === message.id && "bg-primary/10"
              )}
            >
              {message.kind === "system" ? (
                <SystemMessageRow message={message} />
              ) : editingId === message.id ? (
                <div className="flex justify-end py-0.5">
                  <div className="flex w-full max-w-[75%] flex-col gap-1.5 rounded-2xl border bg-card p-2">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                      className="max-h-32"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <MessageBubble
                  message={message}
                  isGroup={isGroup}
                  replyToMessage={replyToMessage}
                  canEdit={message.isOwn && isWithinEditWindow(message.createdAt)}
                  pinned={isPinned(conversationId, message.id)}
                  onReply={() => onReply(message)}
                  onCopy={() => handleCopy(message.text)}
                  onEdit={() => startEdit(message)}
                  onDeleteForMe={() => deleteMessageForMe(message.id)}
                  onDeleteForEveryone={
                    message.isOwn ? () => deleteMessageForEveryone(conversationId, message.id) : undefined
                  }
                  onReact={(emoji) => toggleReaction(conversationId, message.id, emoji)}
                  onTogglePin={() =>
                    isPinned(conversationId, message.id)
                      ? unpinMessage(conversationId, message.id)
                      : pinMessage(conversationId, message.id)
                  }
                />
              )}
            </div>
          </React.Fragment>
        )
      })}
      {typingMembers.length > 0 && (
        <div className="py-1">
          <TypingIndicator />
        </div>
      )}
    </div>
  )
}
