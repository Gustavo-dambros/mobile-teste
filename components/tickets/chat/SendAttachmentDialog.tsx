"use client"

import * as React from "react"
import {
  DownloadIcon,
  FileTextIcon,
  PlusIcon,
  SendIcon,
  XIcon,
} from "lucide-react"

import type { TicketAttachment } from "@/components/tickets/types"
import { formatFileSize } from "@/lib/tickets/format"
import { ACCEPTED_ATTACHMENT_TYPES } from "@/lib/tickets/upload"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function SendAttachmentDialog({
  open,
  attachments,
  caption,
  onCaptionChange,
  onAddFiles,
  onRemove,
  onClose,
  onSend,
}: {
  open: boolean
  attachments: TicketAttachment[]
  caption: string
  onCaptionChange: (value: string) => void
  onAddFiles: (files: File[]) => void
  onRemove: (id: string) => void
  onClose: () => void
  onSend: () => void
}) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const safeIndex = Math.min(activeIndex, Math.max(attachments.length - 1, 0))
  const active = attachments[safeIndex]

  function handlePickMoreFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) onAddFiles(picked)
    e.target.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 z-50 flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-none bg-black p-0 shadow-none sm:max-w-none"
      >
        <DialogTitle className="sr-only">Enviar anexo</DialogTitle>

        <div className="flex shrink-0 items-center justify-between p-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <XIcon />
            <span className="sr-only">Fechar</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            nativeButton={false}
            render={<a href={active?.url} download={active?.name} />}
          >
            <DownloadIcon />
            <span className="sr-only">Baixar</span>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          {active?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.url}
              alt={active.name}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          ) : active?.kind === "video" ? (
            <video
              src={active.url}
              controls
              className="max-h-full max-w-full rounded-lg"
            />
          ) : active ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <FileTextIcon className="size-16" />
              <span className="text-sm">{active.name}</span>
              <span className="text-xs text-white/60">
                {formatFileSize(active.size)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-2xl shrink-0 flex-col gap-3 p-3">
          <Input
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Adicionar uma mensagem..."
            className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-visible:border-white/40"
          />
          <div className="flex items-center gap-2 overflow-x-auto">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_ATTACHMENT_TYPES}
              onChange={handlePickMoreFiles}
              className="hidden"
            />
            {attachments.map((att, i) => (
              <button
                key={att.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "relative size-12 shrink-0 overflow-hidden rounded-md border-2",
                  i === safeIndex
                    ? "border-white"
                    : "border-transparent opacity-60 hover:opacity-90"
                )}
              >
                {att.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.url} alt="" className="size-full object-cover" />
                ) : att.kind === "video" ? (
                  <video src={att.url} className="size-full object-cover" muted />
                ) : (
                  <span className="flex size-full items-center justify-center bg-white/10 text-white">
                    <FileTextIcon className="size-5" />
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(att.id)
                  }}
                  className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-black text-white"
                >
                  <XIcon className="size-2.5" />
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-12 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-white/30 text-white hover:bg-white/10"
            >
              <PlusIcon />
              <span className="sr-only">Adicionar mais arquivos</span>
            </button>
          </div>
          <Button
            className="w-full"
            onClick={onSend}
            disabled={attachments.length === 0}
          >
            <SendIcon data-icon="inline-start" />
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
