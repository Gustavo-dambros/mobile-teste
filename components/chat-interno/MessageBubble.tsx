"use client"

import { motion, useReducedMotion } from "motion/react"
import {
  CheckCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  PinIcon,
  PinOffIcon,
  PencilIcon,
  ReplyIcon,
  TrashIcon,
} from "lucide-react"

import { cn, hashColor } from "@/lib/utils"
import { messageBubble } from "@/lib/motion"
import { formatFileSize, formatTime } from "@/lib/tickets/format"
import type { ChatAttachment, ChatMessage } from "@/lib/chat-interno/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

function AttachmentPreview({ attachment, isOwn }: { attachment: ChatAttachment; isOwn: boolean }) {
  if (attachment.kind === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.url} alt={attachment.name} className="max-h-64 w-full object-cover" />
      </a>
    )
  }
  if (attachment.kind === "video") {
    return (
      <video src={attachment.url} controls className="max-h-64 w-full rounded-lg" />
    )
  }
  if (attachment.kind === "audio") {
    return (
      <div className="flex flex-col gap-1">
        <audio src={attachment.url} controls className="h-10 w-56 max-w-full" />
        {attachment.durationSeconds !== undefined && (
          <span className={cn("text-[0.65rem]", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {Math.round(attachment.durationSeconds)}s
          </span>
        )}
      </div>
    )
  }
  return (
    <a
      href={attachment.url}
      download={attachment.name}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2",
        isOwn ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-foreground/10 bg-foreground/5"
      )}
    >
      <FileTextIcon className="size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col text-xs">
        <span className="truncate font-medium">{attachment.name}</span>
        <span className="opacity-70">{formatFileSize(attachment.size)}</span>
      </div>
      <DownloadIcon className="size-4 shrink-0" />
    </a>
  )
}

export function MessageBubble({
  message,
  isGroup,
  replyToMessage,
  canEdit,
  pinned,
  onReply,
  onCopy,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onReact,
  onTogglePin,
}: {
  message: ChatMessage
  isGroup: boolean
  replyToMessage?: ChatMessage
  canEdit: boolean
  pinned: boolean
  onReply: () => void
  onCopy: () => void
  onEdit: () => void
  onDeleteForMe: () => void
  onDeleteForEveryone?: () => void
  onReact: (emoji: string) => void
  onTogglePin: () => void
}) {
  const reduced = useReducedMotion()
  const isOwn = message.isOwn
  const isDeleted = !!message.deletedForEveryone
  const color = hashColor(String(message.authorId))
  const reactionEntries = Object.entries(message.reactions).filter(([, authors]) => authors.length > 0)

  return (
    <motion.div
      variants={messageBubble(reduced)}
      initial="hidden"
      animate="show"
      className={cn("group/message flex items-end gap-2 py-0.5", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative flex max-w-[75%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm shadow-sm",
          isOwn ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {(pinned || (!isOwn && isGroup)) && (
          <div className="flex items-center gap-1">
            {pinned && (
              <PinIcon
                className={cn("size-3 shrink-0", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}
              />
            )}
            {!isOwn && isGroup && (
              <span className="text-xs font-medium" style={{ color }}>
                {message.authorName}
              </span>
            )}
          </div>
        )}

        {replyToMessage && !isDeleted && (
          <div
            className={cn(
              "flex flex-col gap-0.5 rounded-md border-l-2 px-2 py-1 text-xs",
              isOwn ? "border-primary-foreground/40 bg-primary-foreground/10" : "border-foreground/20 bg-foreground/5"
            )}
          >
            <span className="font-medium opacity-80">{replyToMessage.authorName}</span>
            <span className="truncate opacity-70">
              {replyToMessage.deletedForEveryone ? "Mensagem apagada" : replyToMessage.text}
            </span>
          </div>
        )}

        {isDeleted ? (
          <span className={cn("text-sm italic", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
            Mensagem apagada
          </span>
        ) : (
          <>
            {message.text && <span className="whitespace-pre-wrap break-words">{message.text}</span>}
            {message.attachments.map((att) => (
              <AttachmentPreview key={att.id} attachment={att} isOwn={isOwn} />
            ))}
          </>
        )}

        <div
          className={cn(
            "flex items-center gap-1 self-end text-[0.65rem]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {message.editedAt && !isDeleted && <span>editada</span>}
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && !isDeleted && (
            <span>
              {message.status === "seen" ? (
                <CheckCheckIcon className="size-3.5 text-sky-300" />
              ) : message.status === "delivered" ? (
                <CheckCheckIcon className="size-3.5" />
              ) : (
                <CheckIcon className="size-3.5" />
              )}
            </span>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className="-mt-1 -mb-1 flex flex-wrap gap-1 self-start">
            {reactionEntries.map(([emoji, authors]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs",
                  isOwn
                    ? "border-primary-foreground/30 bg-primary-foreground/10"
                    : "border-foreground/15 bg-background"
                )}
              >
                <span>{emoji}</span>
                <span>{authors.length}</span>
              </button>
            ))}
          </div>
        )}

        {!isDeleted && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-current/70 opacity-0 transition-opacity hover:bg-foreground/10 group-hover/message:opacity-100 data-open:opacity-100"
                />
              }
            >
              <ChevronDownIcon className="size-3" />
              <span className="sr-only">Opções da mensagem</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <div className="flex items-center justify-between gap-0.5 px-0.5 py-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(emoji)}
                    className="rounded-md p-1 text-base transition-colors hover:bg-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onReply}>
                <ReplyIcon />
                Responder
              </DropdownMenuItem>
              {message.text && (
                <DropdownMenuItem onClick={onCopy}>
                  <CopyIcon />
                  Copiar
                </DropdownMenuItem>
              )}
              {isOwn && canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <PencilIcon />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onTogglePin}>
                {pinned ? <PinOffIcon /> : <PinIcon />}
                {pinned ? "Desafixar" : "Fixar mensagem"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDeleteForMe}>
                <TrashIcon />
                Apagar para mim
              </DropdownMenuItem>
              {isOwn && onDeleteForEveryone && (
                <DropdownMenuItem variant="destructive" onClick={onDeleteForEveryone}>
                  <TrashIcon />
                  Apagar para todos
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  )
}
