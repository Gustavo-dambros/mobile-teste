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
    // The receiver's typing indicator has a 3s TTL (lib/chat-interno/store.tsx),
    // so broadcasting at most once every 2s per conversation is enough to keep
    // it alive continuously while the user keeps typing, instead of firing a
    // realtime broadcast on every keystroke.
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
    <div className="flex flex-col gap-2 border-t p-3">
      {replyTo && (
        <div className="flex items-center justify-between gap-2 rounded-lg border-l-2 border-primary bg-muted/60 px-3 py-1.5 text-xs">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{replyTo.authorName}</span>
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
            <div key={att.id} className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2 py-1 text-xs">
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
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <span className="flex size-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
          <span className="flex-1 text-sm text-destructive">
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
        <div className="flex items-end gap-1.5">
          <EmojiPickerPopover onPick={(emoji) => setText((prev) => prev + emoji)} />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_ATTACHMENT_TYPES}
            onChange={handlePickFiles}
            className="hidden"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
            <PaperclipIcon />
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
            placeholder="Escreva uma mensagem..."
            rows={1}
            className={cn("max-h-32 flex-1 resize-none")}
          />
          {text.trim() || attachments.length > 0 ? (
            <Button type="button" size="icon" onClick={handleSend}>
              <SendIcon />
              <span className="sr-only">Enviar</span>
            </Button>
          ) : (
            <Button type="button" variant="outline" size="icon" onClick={handleToggleRecording}>
              <MicIcon />
              <span className="sr-only">Gravar mensagem de voz</span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
