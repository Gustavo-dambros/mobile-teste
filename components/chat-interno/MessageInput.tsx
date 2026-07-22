"use client"

import * as React from "react"
import { toast } from "sonner"
import { MicIcon, PaperclipIcon, SendIcon, SquareIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatFileSize } from "@/lib/tickets/format"
import { useAudioRecorder } from "@/lib/chat-interno/audio-recorder"
import { useChatInterno } from "@/lib/chat-interno/store"
import { ACCEPTED_ATTACHMENT_TYPES, blobToAudioAttachment, filesToAttachments } from "@/lib/chat-interno/upload"
import type { ChatAttachment, ChatMessage } from "@/lib/chat-interno/types"
import { EmojiPickerPopover } from "@/components/chat-interno/EmojiPickerPopover"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function MessageInput({
  conversationId,
  replyTo,
  onCancelReply,
}: {
  conversationId: string
  replyTo?: ChatMessage | null
  onCancelReply?: () => void
}) {
  const { sendMessage, setTyping } = useChatInterno()
  const [text, setText] = React.useState("")
  const [attachments, setAttachments] = React.useState<ChatAttachment[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const recorder = useAudioRecorder()
  const lastTypingBroadcastRef = React.useRef<{ conversationId: string; at: number } | null>(null)

  function handleTextChange(value: string) {
    setText(value)
    if (!value.trim()) return
    const last = lastTypingBroadcastRef.current
    const now = Date.now()
    if (last && last.conversationId === conversationId && now - last.at < 2000) return
    lastTypingBroadcastRef.current = { conversationId, at: now }
    setTyping(conversationId)
  }

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) setAttachments((prev) => [...prev, ...filesToAttachments(picked)])
    e.target.value = ""
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleSend() {
    if (!text.trim() && attachments.length === 0) return
    const sentText = text
    const sentAttachments = attachments
    setText("")
    setAttachments([])
    onCancelReply?.()
    const result = await sendMessage(conversationId, {
      text: sentText,
      attachments: sentAttachments,
      replyToId: replyTo?.id,
    })
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível enviar a mensagem")
    }
  }

  async function handleToggleRecording() {
    if (recorder.recording) {
      const result = await recorder.stop()
      if (result && result.durationSeconds >= 1) {
        const attachment = blobToAudioAttachment(result.blob, result.durationSeconds)
        const sendResult = await sendMessage(conversationId, { text: "", attachments: [attachment] })
        if (!sendResult.ok) toast.error(sendResult.error ?? "Não foi possível enviar o áudio")
      }
      return
    }
    await recorder.start()
  }

  return (
    <div className="flex flex-col gap-2 bg-background p-2 pb-20">
      {replyTo && (
        <div className="flex items-center justify-between gap-2 rounded-xl border-l-4 border-primary bg-muted/80 px-3 py-2 text-xs">
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold text-primary">{replyTo.authorName}</span>
            <span className="truncate text-muted-foreground">
              {replyTo.deletedForEveryone ? "Mensagem apagada" : replyTo.text}
            </span>
          </div>
          <Button type="button" variant="ghost" size="icon-xs" onClick={onCancelReply}>
            <XIcon />
            <span className="sr-only">Cancelar resposta</span>
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs">
              <span className="max-w-32 truncate">{att.name}</span>
              <span className="text-muted-foreground">{formatFileSize(att.size)}</span>
              <button type="button" onClick={() => removeAttachment(att.id)} className="rounded-full p-0.5 hover:bg-foreground/10">
                <XIcon className="size-3" />
                <span className="sr-only">Remover {att.name}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {recorder.recording ? (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <span className="flex size-3 shrink-0 animate-pulse rounded-full bg-destructive" />
          <span className="flex-1 text-sm font-medium text-destructive">
            Gravando... {Math.floor(recorder.durationSeconds)}s
          </span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={recorder.cancel}>
            <XIcon />
            <span className="sr-only">Cancelar gravação</span>
          </Button>
          <Button type="button" variant="destructive" size="icon-sm" onClick={handleToggleRecording}>
            <SquareIcon className="size-3.5" />
            <span className="sr-only">Parar e enviar</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2 rounded-2xl bg-muted/50 p-1.5">
          <EmojiPickerPopover onPick={(emoji) => setText((prev) => prev + emoji)} />
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
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon className="h-5 w-5" />
            <span className="sr-only">Anexar arquivo</span>
          </Button>
          <Textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Digite uma mensagem"
            rows={1}
            className={cn(
              "min-h-[40px] max-h-24 flex-1 resize-none rounded-2xl border-0 bg-background px-4 py-2.5 text-sm shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
          />
          {text.trim() || attachments.length > 0 ? (
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSend}
            >
              <SendIcon className="h-5 w-5" />
              <span className="sr-only">Enviar</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              onClick={handleToggleRecording}
            >
              <MicIcon className="h-5 w-5" />
              <span className="sr-only">Gravar mensagem de voz</span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
