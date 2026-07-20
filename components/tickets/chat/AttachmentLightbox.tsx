"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ReplyIcon,
  XIcon,
} from "lucide-react"

import type { TicketAttachment } from "@/components/tickets/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export interface GalleryItem {
  attachment: TicketAttachment
  /** null for attachments on the ticket's own opening description. */
  messageId: string | null
}

export function AttachmentLightbox({
  items,
  index,
  onIndexChange,
  onReply,
}: {
  items: GalleryItem[]
  index: number | null
  onIndexChange: (index: number | null) => void
  onReply?: (messageId: string) => void
}) {
  const open = index !== null && index >= 0 && index < items.length
  const current = open ? items[index as number] : null

  const goTo = React.useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= items.length) return
      onIndexChange(nextIndex)
    },
    [items.length, onIndexChange]
  )

  React.useEffect(() => {
    if (!open || index === null) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo((index as number) - 1)
      if (e.key === "ArrowRight") goTo((index as number) + 1)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, index, goTo])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 z-50 flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-none bg-black p-0 shadow-none sm:max-w-none"
      >
        <DialogTitle className="sr-only">
          {current?.attachment.name ?? "Anexo"}
        </DialogTitle>

        <div className="flex shrink-0 items-center justify-end gap-1 p-2">
          {current?.messageId && onReply && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                onReply(current.messageId as string)
                onIndexChange(null)
              }}
            >
              <ReplyIcon />
              <span className="sr-only">Responder</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            nativeButton={false}
            render={
              <a href={current?.attachment.url} download={current?.attachment.name} />
            }
          >
            <DownloadIcon />
            <span className="sr-only">Baixar</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => onIndexChange(null)}
          >
            <XIcon />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => goTo((index as number) - 1)}
              disabled={index === 0}
              className="absolute left-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:bg-black/60 disabled:opacity-30"
            >
              <ChevronLeftIcon />
              <span className="sr-only">Anterior</span>
            </button>
          )}

          {current?.attachment.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.attachment.url}
              alt={current.attachment.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : current ? (
            <video
              src={current.attachment.url}
              controls
              autoPlay
              className="max-h-full max-w-full"
            />
          ) : null}

          {items.length > 1 && (
            <button
              type="button"
              onClick={() => goTo((index as number) + 1)}
              disabled={index === items.length - 1}
              className="absolute right-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:bg-black/60 disabled:opacity-30"
            >
              <ChevronRightIcon />
              <span className="sr-only">Próxima</span>
            </button>
          )}
        </div>

        {items.length > 1 && (
          <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-center gap-1.5 overflow-x-auto p-3">
            {items.map((item, i) => (
              <button
                key={item.attachment.id}
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "size-12 shrink-0 overflow-hidden rounded-md border-2 transition-opacity",
                  i === index
                    ? "border-white opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
                )}
              >
                {item.attachment.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.attachment.url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <video
                    src={item.attachment.url}
                    className="size-full object-cover"
                    muted
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
