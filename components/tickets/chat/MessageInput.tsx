"use client"

import * as React from "react"
import { PaperclipIcon, SendIcon } from "lucide-react"

import type { TicketAttachment } from "@/components/tickets/types"
import {
  ACCEPTED_ATTACHMENT_TYPES,
  filesToAttachments,
  revokeAttachmentUrls,
} from "@/lib/tickets/upload"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CannedResponsesPopover } from "@/components/tickets/chat/CannedResponsesPopover"
import { SendAttachmentDialog } from "@/components/tickets/chat/SendAttachmentDialog"

export function MessageInput({
  disabled,
  autoFocusToken,
  showCannedResponses,
  onSend,
}: {
  disabled?: boolean
  /** Bump this value whenever the input should be refocused (e.g. after send). */
  autoFocusToken?: number
  /** Staff-facing views (queue/history) can insert a saved canned response; requesters composing their own ticket can't. */
  showCannedResponses?: boolean
  onSend: (text: string, attachments: TicketAttachment[]) => void
}) {
  const [text, setText] = React.useState("")
  const [composeAttachments, setComposeAttachments] = React.useState<TicketAttachment[]>([])
  const [composeCaption, setComposeCaption] = React.useState("")
  const [composeOpen, setComposeOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!disabled) textareaRef.current?.focus()
  }, [autoFocusToken, disabled])

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) {
      setComposeAttachments(filesToAttachments(picked))
      setComposeCaption("")
      setComposeOpen(true)
    }
    e.target.value = ""
  }

  function handleAddMoreFiles(files: File[]) {
    setComposeAttachments((prev) => [...prev, ...filesToAttachments(files)])
  }

  function handleRemoveComposeAttachment(id: string) {
    setComposeAttachments((prev) => {
      const found = prev.find((a) => a.id === id)
      if (found) revokeAttachmentUrls([found])
      return prev.filter((a) => a.id !== id)
    })
  }

  function handleCloseCompose() {
    revokeAttachmentUrls(composeAttachments)
    setComposeAttachments([])
    setComposeCaption("")
    setComposeOpen(false)
  }

  function handleSendCompose() {
    if (composeAttachments.length === 0) return
    onSend(composeCaption.trim(), composeAttachments)
    setComposeAttachments([])
    setComposeCaption("")
    setComposeOpen(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed, [])
    setText("")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t bg-background px-4 py-3 pb-20 lg:px-6">
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_TYPES}
          onChange={handlePickFiles}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <PaperclipIcon className="h-5 w-5" />
          <span className="sr-only">Anexar arquivo</span>
        </Button>
        {showCannedResponses && !disabled && (
          <CannedResponsesPopover
            onPick={(body) => {
              setText((prev) => (prev.trim() ? `${prev}\n${body}` : body))
              requestAnimationFrame(() => textareaRef.current?.focus())
            }}
          />
        )}
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? "Este chamado está encerrado" : "Digite uma mensagem..."
          }
          disabled={disabled}
          rows={1}
          className="min-h-9 max-h-16 flex-1 resize-none overflow-y-auto py-2"
        />
        <Button
          type="button"
          size="icon"
          className="shrink-0 h-10 w-10"
          disabled={disabled || !text.trim()}
          onClick={handleSend}
        >
          <SendIcon className="h-5 w-5" />
          <span className="sr-only">Enviar mensagem</span>
        </Button>
      </div>

      <SendAttachmentDialog
        open={composeOpen}
        attachments={composeAttachments}
        caption={composeCaption}
        onCaptionChange={setComposeCaption}
        onAddFiles={handleAddMoreFiles}
        onRemove={handleRemoveComposeAttachment}
        onClose={handleCloseCompose}
        onSend={handleSendCompose}
      />
    </div>
  )
}
