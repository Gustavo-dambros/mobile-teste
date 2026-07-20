"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { AlertCircleIcon, ArrowDownIcon, FileIcon, PaperclipIcon, SendIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { messageBubble } from "@/lib/motion"
import { participantInitials, useReunioes } from "@/lib/reunioes/store"
import { colorForParticipant } from "@/lib/reunioes/participant-color"
import type { ConnectionBadgeState } from "@/lib/media/use-connection-state"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ConnectionBadge } from "@/components/media/ConnectionBadge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
const AT_BOTTOM_THRESHOLD_PX = 80

function isImageAttachment(name: string) {
  const lower = name.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

interface PendingMessage {
  localId: string
  text: string
  attachment?: { url: string; name: string }
  status: "sending" | "error"
}

export function ChatPanel({
  meetingId,
  localParticipantId,
  connectionState,
  canSend = true,
  open,
  onOpenChange,
}: {
  meetingId: string
  localParticipantId: string
  connectionState: ConnectionBadgeState | null
  /** False when the host disabled chat for link guests — messages already sent are
   * still visible, only the composer is locked. */
  canSend?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const reduced = useReducedMotion()
  const { getMeeting, sendChatMessage, uploadChatAttachment } = useReunioes()
  const meeting = getMeeting(meetingId)
  const [text, setText] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [pending, setPending] = React.useState<PendingMessage[]>([])
  const [showNewMessagesPill, setShowNewMessagesPill] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const isAtBottomRef = React.useRef(true)

  const localParticipant = meeting?.participants.find((p) => p.id === localParticipantId)
  const messages = meeting?.chatMessages ?? []
  const offline = connectionState === "reconnecting"
  const composerDisabled = offline || !canSend

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    isAtBottomRef.current = true
    setShowNewMessagesPill(false)
  }

  // Jump to the latest message every time the panel opens, regardless of where it was left.
  React.useEffect(() => {
    if (open) requestAnimationFrame(() => scrollToBottom("auto"))
  }, [open])

  // New messages only auto-scroll if the reader was already at the bottom — otherwise a
  // "novas mensagens" pill appears instead of yanking their scroll position around.
  React.useEffect(() => {
    if (!open) return
    if (isAtBottomRef.current) scrollToBottom("smooth")
    else setShowNewMessagesPill(true)
  }, [open, messages.length, pending.length])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_THRESHOLD_PX
    isAtBottomRef.current = atBottom
    if (atBottom) setShowNewMessagesPill(false)
  }

  async function trySend(localId: string, messageText: string, attachment?: { url: string; name: string }) {
    const result = await sendChatMessage(meetingId, localParticipantId, messageText, attachment)
    setPending((prev) =>
      result.ok
        ? prev.filter((p) => p.localId !== localId)
        : prev.map((p) => (p.localId === localId ? { ...p, status: "error" } : p))
    )
  }

  function handleSend() {
    if (!localParticipant || !text.trim() || composerDisabled) return
    const localId = crypto.randomUUID()
    const messageText = text
    setPending((prev) => [...prev, { localId, text: messageText, status: "sending" }])
    setText("")
    trySend(localId, messageText)
  }

  function retry(item: PendingMessage) {
    setPending((prev) => prev.map((p) => (p.localId === item.localId ? { ...p, status: "sending" } : p)))
    trySend(item.localId, item.text, item.attachment)
  }

  function discard(localId: string) {
    setPending((prev) => prev.filter((p) => p.localId !== localId))
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !localParticipant || composerDisabled) return
    setUploading(true)
    try {
      const result = await uploadChatAttachment(meetingId, localParticipantId, file)
      setUploading(false)
      if (result.ok && result.url && result.name) {
        const localId = crypto.randomUUID()
        const attachment = { url: result.url, name: result.name }
        setPending((prev) => [...prev, { localId, text, attachment, status: "sending" }])
        setText("")
        trySend(localId, text, attachment)
      } else {
        toastAttachmentError()
      }
    } catch {
      setUploading(false)
      toastAttachmentError()
    }
  }

  function toastAttachmentError() {
    setPending((prev) => [
      ...prev,
      { localId: crypto.randomUUID(), text: "Falha ao anexar arquivo.", status: "error" },
    ])
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <SheetTitle>Chat da reunião</SheetTitle>
          <ConnectionBadge state={connectionState} />
        </SheetHeader>
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-2"
          >
            {messages.length === 0 && pending.length === 0 ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
            ) : (
              <>
                {messages.map((m) => {
                  const isMine = m.authorParticipantId === localParticipantId
                  const color = colorForParticipant(m.authorParticipantId || m.authorName)
                  return (
                    <motion.div
                      key={m.id}
                      variants={messageBubble(reduced)}
                      initial="hidden"
                      animate="show"
                      className={cn("flex max-w-[85%] items-end gap-2", isMine ? "self-end flex-row-reverse" : "self-start")}
                    >
                      {!isMine && (
                        <Avatar size="sm" className="mb-0.5 shrink-0" style={{ boxShadow: `0 0 0 2px ${color}` }}>
                          <AvatarFallback style={{ backgroundColor: `${color}26`, color }}>
                            {participantInitials(m.authorName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "flex min-w-0 flex-col gap-1 rounded-lg p-2 text-sm",
                          isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        {!isMine && <span className="text-xs font-medium opacity-80">{m.authorName}</span>}
                        {m.text && <span className="break-words whitespace-pre-wrap">{m.text}</span>}
                        {m.attachmentUrl &&
                          m.attachmentName &&
                          (isImageAttachment(m.attachmentName) ? (
                            <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={m.attachmentUrl}
                                alt={m.attachmentName}
                                className="max-h-48 max-w-full rounded-md object-contain"
                              />
                            </a>
                          ) : (
                            <a
                              href={m.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-1.5 truncate rounded-md p-1.5 text-xs underline underline-offset-2",
                                isMine ? "bg-primary-foreground/10" : "bg-background"
                              )}
                            >
                              <FileIcon className="size-3.5 shrink-0" />
                              <span className="truncate">{m.attachmentName}</span>
                            </a>
                          ))}
                        <span
                          className={cn(
                            "text-[10px]",
                            isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {timeLabel(m.createdAt)}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}

                {pending.map((p) => (
                  <motion.div
                    key={p.localId}
                    variants={messageBubble(reduced)}
                    initial="hidden"
                    animate="show"
                    className="flex max-w-[85%] flex-col items-end gap-1 self-end"
                  >
                    <div
                      className={cn(
                        "flex flex-col gap-1 rounded-lg p-2 text-sm",
                        p.status === "error"
                          ? "border border-destructive/50 bg-destructive/10"
                          : "bg-primary/60 text-primary-foreground"
                      )}
                    >
                      {p.text && <span className="break-words whitespace-pre-wrap">{p.text}</span>}
                      {p.attachment && (
                        <span className="flex items-center gap-1.5 text-xs">
                          <FileIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{p.attachment.name}</span>
                        </span>
                      )}
                    </div>
                    {p.status === "sending" ? (
                      <span className="text-[10px] text-muted-foreground">Enviando...</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] text-destructive">
                        <AlertCircleIcon className="size-3" /> Falha ao enviar
                        <button type="button" className="underline" onClick={() => retry(p)}>
                          Tentar de novo
                        </button>
                        <button type="button" className="underline" onClick={() => discard(p.localId)}>
                          Descartar
                        </button>
                      </span>
                    )}
                  </motion.div>
                ))}
              </>
            )}
          </div>

          {showNewMessagesPill && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="pointer-events-auto shadow-md"
                onClick={() => scrollToBottom("smooth")}
              >
                <ArrowDownIcon data-icon="inline-start" />
                Novas mensagens
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-end gap-2 border-t p-4">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || composerDisabled}
          >
            <PaperclipIcon />
            <span className="sr-only">Anexar arquivo</span>
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              offline
                ? "Sem conexão..."
                : !canSend
                  ? "O anfitrião desativou o chat para convidados pelo link"
                  : "Escreva uma mensagem..."
            }
            disabled={composerDisabled}
            rows={1}
            className="max-h-24"
          />
          <Button type="button" size="icon" onClick={handleSend} disabled={!text.trim() || composerDisabled}>
            <SendIcon />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
