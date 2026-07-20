"use client"

import { motion, useReducedMotion } from "motion/react"
import {
  CheckCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FlagIcon,
  InfoIcon,
  OctagonAlertIcon,
  PencilIcon,
  ReplyIcon,
  TrashIcon,
} from "lucide-react"

import type { TicketAttachment, TicketMessage } from "@/components/tickets/types"
import { formatDateTime, formatDaySeparator, formatTime } from "@/lib/tickets/format"
import { messageBubble } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageAttachments } from "@/components/tickets/chat/MessageAttachments"

export type MessageSelectionMode = "forMe" | "forEveryone" | null

export function DateSeparator({ iso }: { iso: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={messageBubble(reduced)}
      initial="hidden"
      animate="show"
      className="flex justify-center py-2"
    >
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
        {formatDaySeparator(iso)}
      </span>
    </motion.div>
  )
}

function TicketClosedCard({ message }: { message: TicketMessage }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={messageBubble(reduced)}
      initial="hidden"
      animate="show"
      className="flex justify-center py-1"
    >
      <Card className="w-full max-w-md border-destructive/30 bg-destructive/5 shadow-none">
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <OctagonAlertIcon className="size-4 shrink-0" />
            Chamado encerrado
          </div>
          <p className="text-sm text-foreground/80">{message.text}</p>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(message.createdAt)}
          </span>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function SystemMessageRow({ message }: { message: TicketMessage }) {
  const reduced = useReducedMotion()

  if (message.systemEvent === "closed") {
    return <TicketClosedCard message={message} />
  }

  return (
    <motion.div
      variants={messageBubble(reduced)}
      initial="hidden"
      animate="show"
      className="flex justify-center py-1.5"
    >
      <span className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-center text-xs font-medium text-foreground/80">
        <InfoIcon className="size-3.5 shrink-0 text-primary" />
        {message.text}
      </span>
    </motion.div>
  )
}

export function MessageBubble({
  message,
  replyToMessage,
  readOnly = false,
  canEdit,
  selectionMode,
  selected,
  onToggleSelect,
  onReply,
  onCopy,
  onEdit,
  onDeleteRequest,
  onReport,
  onPreviewAttachment,
}: {
  message: TicketMessage
  replyToMessage?: TicketMessage
  /** When true, hides the per-message actions menu entirely (archived/closed tickets). */
  readOnly?: boolean
  canEdit: boolean
  selectionMode: MessageSelectionMode
  selected: boolean
  onToggleSelect: () => void
  onReply: () => void
  onCopy: () => void
  onEdit?: () => void
  onDeleteRequest: () => void
  onReport?: () => void
  onPreviewAttachment: (attachment: TicketAttachment) => void
}) {
  const reduced = useReducedMotion()
  const isOwn = message.isOwn
  const showCheckbox =
    selectionMode === "forMe" || (selectionMode === "forEveryone" && isOwn)
  const isDeleted = message.deletedForEveryone || message.deletedForMe

  return (
    <motion.div
      variants={messageBubble(reduced)}
      initial="hidden"
      animate="show"
      className={cn(
        "group/message flex items-end gap-2 py-0.5",
        isOwn
          ? showCheckbox
            ? "justify-between"
            : "justify-end"
          : "justify-start"
      )}
    >
      {showCheckbox && (
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="mb-1 shrink-0"
        />
      )}
      <div
        className={cn(
          "relative flex max-w-[75%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm shadow-sm",
          isOwn
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {!isOwn && (
          <span className="text-xs font-medium text-muted-foreground">
            {message.authorName}
          </span>
        )}

        {replyToMessage && !isDeleted && (
          <div
            className={cn(
              "flex flex-col gap-0.5 rounded-md border-l-2 px-2 py-1 text-xs",
              isOwn
                ? "border-primary-foreground/40 bg-primary-foreground/10"
                : "border-foreground/20 bg-foreground/5"
            )}
          >
            <span className="font-medium opacity-80">
              {replyToMessage.authorName}
            </span>
            <span className="truncate opacity-70">
              {replyToMessage.deletedForEveryone
                ? "Mensagem apagada"
                : replyToMessage.text}
            </span>
          </div>
        )}

        {isDeleted ? (
          <span
            className={cn(
              "text-sm italic",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            Mensagem apagada
          </span>
        ) : (
          <>
            {message.text && (
              <span className="whitespace-pre-wrap break-words">
                {message.text}
              </span>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments
                attachments={message.attachments}
                onPreview={onPreviewAttachment}
              />
            )}
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

        {!isDeleted && !selectionMode && !readOnly && (
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onReply}>
                <ReplyIcon />
                Responder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy}>
                <CopyIcon />
                Copiar
              </DropdownMenuItem>
              {isOwn ? (
                <>
                  {canEdit && onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <PencilIcon />
                      Editar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
                    <TrashIcon />
                    Apagar
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  {onReport && (
                    <DropdownMenuItem onClick={onReport}>
                      <FlagIcon />
                      Denunciar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
                    <TrashIcon />
                    Apagar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  )
}
