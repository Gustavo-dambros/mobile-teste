"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronDownIcon } from "lucide-react"
import { toast } from "sonner"

import type {
  TicketAttachment,
  TicketMessage,
} from "@/components/tickets/types"
import { useCurrentUser } from "@/lib/current-user/context"
import { isSameDay, isWithinEditWindow } from "@/lib/tickets/format"
import { useTickets } from "@/lib/tickets/store"
import { useTicketRealtime } from "@/lib/tickets/realtime"
import { TicketActionsMenu } from "@/components/tickets/TicketActionsMenu"
import { QueueActionsMenu } from "@/components/tickets/QueueActionsMenu"
import { HistoryActionsMenu } from "@/components/tickets/HistoryActionsMenu"
import { EditTicketDialog } from "@/components/tickets/EditTicketDialog"
import { CloseTicketDialog } from "@/components/tickets/CloseTicketDialog"
import { DeleteTicketDialog } from "@/components/tickets/DeleteTicketDialog"
import { ReopenTicketDialog } from "@/components/tickets/ReopenTicketDialog"
import { AssignTicketDialog } from "@/components/tickets/AssignTicketDialog"
import { TransferTicketDialog } from "@/components/tickets/TransferTicketDialog"
import { TicketChatHeader } from "@/components/tickets/chat/TicketChatHeader"
import { MessageSearchBar } from "@/components/tickets/chat/MessageSearchBar"
import { TicketDescriptionCard } from "@/components/tickets/chat/TicketDescriptionCard"
import {
  DateSeparator,
  MessageBubble,
  SystemMessageRow,
  type MessageSelectionMode,
} from "@/components/tickets/chat/MessageBubble"
import { MessageInput } from "@/components/tickets/chat/MessageInput"
import { SatisfactionSurvey } from "@/components/tickets/chat/SatisfactionSurvey"
import { ReplyPreview } from "@/components/tickets/chat/ReplyPreview"
import { DeleteMessageBar } from "@/components/tickets/chat/DeleteMessageBar"
import { DeleteMessageChoiceDialog } from "@/components/tickets/chat/DeleteMessageChoiceDialog"
import { EditMessageDialog } from "@/components/tickets/chat/EditMessageDialog"
import { ReportMessageDialog } from "@/components/tickets/chat/ReportMessageDialog"
import {
  AttachmentLightbox,
  type GalleryItem,
} from "@/components/tickets/chat/AttachmentLightbox"

const PAGE_SIZE = 40

export type ChatVariant = "mine" | "queue" | "history"

function isSearchableMessage(message: TicketMessage) {
  return (
    message.kind === "message" &&
    !message.deletedForEveryone &&
    !message.deletedForMe
  )
}

export function TicketChatPage({
  ticketId,
  variant = "mine",
}: {
  ticketId: string
  /** Which section this chat is being viewed from — controls the header's 3-dot menu. */
  variant?: ChatVariant
}) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const {
    getTicket,
    getMessages,
    loadMessages,
    addMessage,
    editMessage,
    deleteMessagesForEveryone,
    deleteMessagesForMe,
    updateTicket,
    markSeen,
    setActiveTicketId,
  } = useTickets()

  const ticket = getTicket(ticketId)
  const messages = React.useMemo(
    () => getMessages(ticketId).filter((m) => !m.deletedForMe),
    [getMessages, ticketId]
  )

  React.useEffect(() => {
    loadMessages(ticketId)
  }, [ticketId, loadMessages])

  React.useEffect(() => {
    setActiveTicketId(ticketId)
    return () => setActiveTicketId(null)
  }, [ticketId, setActiveTicketId])

  // Realtime delivers the message inline, so it's merged directly (no
  // network round-trip). The interval poll below re-fetches the full thread
  // periodically as a reliability backstop and to refresh read-receipts.
  React.useEffect(() => {
    const interval = window.setInterval(() => loadMessages(ticketId), 12_000)
    return () => window.clearInterval(interval)
  }, [ticketId, loadMessages])

  useTicketRealtime(
    ticketId,
    React.useCallback(() => loadMessages(ticketId), [ticketId, loadMessages])
  )

  const [editingTicket, setEditingTicket] = React.useState(false)
  const [closingTicket, setClosingTicket] = React.useState(false)
  const [deletingTicket, setDeletingTicket] = React.useState(false)
  const [reopeningTicket, setReopeningTicket] = React.useState(false)
  const [assigningTicket, setAssigningTicket] = React.useState(false)
  const [transferringTicket, setTransferringTicket] = React.useState(false)

  const [replyTo, setReplyTo] = React.useState<TicketMessage | null>(null)
  const [editingMessage, setEditingMessage] = React.useState<TicketMessage | null>(null)
  const [reportingMessage, setReportingMessage] = React.useState<TicketMessage | null>(null)
  const [deleteChoiceMessage, setDeleteChoiceMessage] = React.useState<TicketMessage | null>(null)
  const [selectionMode, setSelectionMode] = React.useState<MessageSelectionMode>(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [sendToken, setSendToken] = React.useState(0)
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null)

  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE)
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchMatchIndex, setSearchMatchIndex] = React.useState(0)
  const [loadedTicketId, setLoadedTicketId] = React.useState(ticketId)

  if (ticketId !== loadedTicketId) {
    setLoadedTicketId(ticketId)
    setVisibleCount(PAGE_SIZE)
    setSearchOpen(false)
    setSearchQuery("")
  }

  React.useEffect(() => {
    markSeen(ticketId)
  }, [ticketId, messages.length, markSeen])

  const hasMoreOlder = messages.length > visibleCount
  const isSearching = searchOpen && searchQuery.trim().length > 0
  const visibleMessages = React.useMemo(() => {
    if (isSearching) return messages
    if (messages.length <= visibleCount) return messages
    return messages.slice(messages.length - visibleCount)
  }, [messages, visibleCount, isSearching])

  function computeMatches(query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return messages.filter(
      (m) => isSearchableMessage(m) && m.text.toLowerCase().includes(q)
    )
  }

  const searchMatches = React.useMemo(
    () => computeMatches(searchQuery),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, searchQuery]
  )

  const galleryItems = React.useMemo<GalleryItem[]>(() => {
    if (!ticket) return []
    const items: GalleryItem[] = []
    for (const att of ticket.attachments) {
      if (att.kind === "image" || att.kind === "video") {
        items.push({ attachment: att, messageId: null })
      }
    }
    for (const message of messages) {
      if (message.deletedForEveryone) continue
      for (const att of message.attachments ?? []) {
        if (att.kind === "image" || att.kind === "video") {
          items.push({ attachment: att, messageId: message.id })
        }
      }
    }
    return items
  }, [ticket, messages])

  function handlePreviewAttachment(attachment: TicketAttachment) {
    const foundIndex = galleryItems.findIndex(
      (item) => item.attachment.id === attachment.id
    )
    if (foundIndex >= 0) setPreviewIndex(foundIndex)
  }

  function handleReplyToAttachment(messageId: string) {
    const target = messages.find((m) => m.id === messageId)
    if (target) setReplyTo(target)
  }

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const isNearBottomRef = React.useRef(true)
  const hasMountedRef = React.useRef(false)
  const prevScrollHeightRef = React.useRef<number | null>(null)

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  function scrollToMessage(messageId: string) {
    document
      .getElementById(`message-${messageId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  React.useEffect(() => {
    scrollToBottom("auto")
    hasMountedRef.current = true
  }, [scrollToBottom, ticketId])

  React.useEffect(() => {
    if (!hasMountedRef.current) return
    if (isNearBottomRef.current) scrollToBottom("smooth")
  }, [messages.length, scrollToBottom])

  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || prevScrollHeightRef.current === null) return
    el.scrollTop += el.scrollHeight - prevScrollHeightRef.current
    prevScrollHeightRef.current = null
  }, [visibleCount])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distanceFromBottom < 120
    setShowJumpToLatest(distanceFromBottom > 300)

    if (el.scrollTop < 60 && hasMoreOlder) {
      prevScrollHeightRef.current = el.scrollHeight
      setVisibleCount((c) => Math.min(messages.length, c + PAGE_SIZE))
    }
  }

  function handleToggleSearch() {
    const wasOpen = searchOpen
    setSearchOpen(!wasOpen)
    if (wasOpen) {
      setSearchQuery("")
      setSearchMatchIndex(0)
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setSearchMatchIndex(0)
    const matches = computeMatches(value)
    if (matches.length > 0) {
      requestAnimationFrame(() => scrollToMessage(matches[0].id))
    }
  }

  function goToMatch(direction: number) {
    if (searchMatches.length === 0) return
    const nextIndex =
      (searchMatchIndex + direction + searchMatches.length) % searchMatches.length
    setSearchMatchIndex(nextIndex)
    scrollToMessage(searchMatches[nextIndex].id)
  }

  if (!ticket) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-muted-foreground">
        <p>Chamado não encontrado.</p>
      </div>
    )
  }

  const isClosed = ticket.status === "Concluído"
  // "mine" self-service actions (edit/delete) belong to the ticket's own
  // requester only — canAccessTicket also lets sector staff read/reply to
  // the same ticket, but they'd normally do that via the Fila (variant
  // "queue"), not by guessing a /meus-chamados/[id] URL.
  const isRequester = ticket.requesterId === currentUser?.id

  function handleSend(text: string, attachments: TicketAttachment[]) {
    addMessage(ticket!.id, text, {
      attachments: attachments.length ? attachments : undefined,
      replyToId: replyTo?.id,
    })
    setReplyTo(null)
    setSendToken((t) => t + 1)
  }

  function handleCopy(message: TicketMessage) {
    navigator.clipboard?.writeText(message.text)
    toast.success("Mensagem copiada")
  }

  function handleDeleteRequest(message: TicketMessage) {
    setDeleteChoiceMessage(message)
  }

  function handleChooseForMe() {
    if (!deleteChoiceMessage) return
    setSelectionMode("forMe")
    setSelectedIds([deleteChoiceMessage.id])
    setDeleteChoiceMessage(null)
  }

  function handleChooseForEveryone() {
    if (!deleteChoiceMessage) return
    setSelectionMode("forEveryone")
    setSelectedIds([deleteChoiceMessage.id])
    setDeleteChoiceMessage(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleCancelSelection() {
    setSelectionMode(null)
    setSelectedIds([])
  }

  function handleConfirmDelete() {
    if (selectionMode === "forEveryone") {
      deleteMessagesForEveryone(ticket!.id, selectedIds)
    } else if (selectionMode === "forMe") {
      deleteMessagesForMe(selectedIds)
    }
    toast.success("Mensagens apagadas")
    handleCancelSelection()
  }

  async function handlePickUp() {
    if (!currentUser) return
    // Was previously fire-and-forget with a hardcoded success toast — always claimed
    // success even when the request failed or (see the 409 conflict guard server-side)
    // someone else had already picked it up first. updateTicket already shows its own
    // error toast on failure, so only confirm here once the request actually succeeds.
    const ok = await updateTicket(ticket!.id, { assigneeId: currentUser.id })
    if (ok) toast.success("Chamado atribuído para você")
  }

  const headerActions =
    variant === "queue" ? (
      <QueueActionsMenu
        showReply={false}
        onAssign={() => setAssigningTicket(true)}
        onTransfer={() => setTransferringTicket(true)}
        onPickUp={handlePickUp}
        onClose={() => setClosingTicket(true)}
      />
    ) : variant === "history" ? (
      <HistoryActionsMenu onReopen={() => setReopeningTicket(true)} />
    ) : isRequester ? (
      <TicketActionsMenu
        showReply={false}
        isClosed={isClosed}
        onEdit={() => setEditingTicket(true)}
        onClose={() => setClosingTicket(true)}
        onReopen={() => setReopeningTicket(true)}
        onDelete={() => setDeletingTicket(true)}
      />
    ) : null

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <TicketChatHeader
        ticket={ticket}
        searchActive={searchOpen}
        onToggleSearch={handleToggleSearch}
        actions={headerActions}
      />

      {searchOpen && (
        <MessageSearchBar
          query={searchQuery}
          onQueryChange={handleSearchChange}
          matchCount={searchMatches.length}
          matchIndex={searchMatchIndex}
          onPrevMatch={() => goToMatch(-1)}
          onNextMatch={() => goToMatch(1)}
          onClose={handleToggleSearch}
        />
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-full flex-col gap-2 overflow-y-auto px-4 py-4 lg:px-6"
        >
          {!isSearching && (
            <TicketDescriptionCard
              ticket={ticket}
              onPreviewAttachment={handlePreviewAttachment}
            />
          )}

          {visibleMessages.map((message, i) => {
            const prev = visibleMessages[i - 1]
            const showSeparator =
              !prev || !isSameDay(new Date(prev.createdAt), new Date(message.createdAt))
            return (
              <div key={message.id} id={`message-${message.id}`}>
                {showSeparator && <DateSeparator iso={message.createdAt} />}
                {message.kind === "system" ? (
                  <SystemMessageRow message={message} />
                ) : (
                  <MessageBubble
                    message={message}
                    replyToMessage={
                      message.replyToId
                        ? messages.find((m) => m.id === message.replyToId)
                        : undefined
                    }
                    readOnly={isClosed}
                    canEdit={message.isOwn && isWithinEditWindow(message.createdAt)}
                    selectionMode={selectionMode}
                    selected={selectedIds.includes(message.id)}
                    onToggleSelect={() => toggleSelect(message.id)}
                    onReply={() => setReplyTo(message)}
                    onCopy={() => handleCopy(message)}
                    onEdit={message.isOwn ? () => setEditingMessage(message) : undefined}
                    onDeleteRequest={() => handleDeleteRequest(message)}
                    onReport={!message.isOwn ? () => setReportingMessage(message) : undefined}
                    onPreviewAttachment={handlePreviewAttachment}
                  />
                )}
              </div>
            )
          })}
        </div>

        {showJumpToLatest && (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full border bg-background text-foreground shadow-md transition-colors hover:bg-muted"
          >
            <ChevronDownIcon className="size-5" />
            <span className="sr-only">Ir para a mensagem mais recente</span>
          </button>
        )}
      </div>

      {isClosed ? (
        variant === "mine" ? (
          <SatisfactionSurvey ticket={ticket} />
        ) : (
          <div className="flex shrink-0 items-center justify-center border-t bg-muted/30 px-4 py-3 text-sm text-muted-foreground lg:px-6">
            Chamado encerrado — somente leitura
          </div>
        )
      ) : selectionMode ? (
        <DeleteMessageBar
          mode={selectionMode}
          selectedCount={selectedIds.length}
          onCancel={handleCancelSelection}
          onConfirm={handleConfirmDelete}
        />
      ) : (
        <>
          {replyTo && (
            <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} />
          )}
          <MessageInput
            disabled={isClosed}
            autoFocusToken={sendToken}
            showCannedResponses={variant !== "mine"}
            onSend={handleSend}
          />
        </>
      )}

      {variant === "mine" && isRequester && (
        <>
          <EditTicketDialog
            ticket={editingTicket ? ticket : null}
            onOpenChange={setEditingTicket}
          />
          <DeleteTicketDialog
            ticket={deletingTicket ? ticket : null}
            onOpenChange={setDeletingTicket}
            onDeleted={() => router.push("/atendimentos/meus-chamados")}
          />
        </>
      )}
      {variant === "queue" && (
        <>
          <AssignTicketDialog
            ticket={assigningTicket ? ticket : null}
            onOpenChange={setAssigningTicket}
          />
          <TransferTicketDialog
            ticket={transferringTicket ? ticket : null}
            onOpenChange={setTransferringTicket}
          />
        </>
      )}
      {(variant === "mine" || variant === "queue") && (
        <CloseTicketDialog
          ticket={closingTicket ? ticket : null}
          onOpenChange={setClosingTicket}
        />
      )}
      <ReopenTicketDialog
        ticket={reopeningTicket ? ticket : null}
        onOpenChange={setReopeningTicket}
      />
      <EditMessageDialog
        message={editingMessage}
        onOpenChange={(open) => !open && setEditingMessage(null)}
        onSave={(id, text) => {
          editMessage(ticket!.id, id, text)
          toast.success("Mensagem editada")
        }}
      />
      <ReportMessageDialog
        message={reportingMessage}
        onOpenChange={(open) => !open && setReportingMessage(null)}
      />
      <DeleteMessageChoiceDialog
        message={deleteChoiceMessage}
        onOpenChange={(open) => !open && setDeleteChoiceMessage(null)}
        onChooseForMe={handleChooseForMe}
        onChooseForEveryone={handleChooseForEveryone}
      />
      <AttachmentLightbox
        items={galleryItems}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onReply={isClosed ? undefined : handleReplyToAttachment}
      />
    </div>
  )
}
