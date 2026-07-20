"use client"

import Image from "next/image"
import { FileTextIcon, VideoIcon, XIcon } from "lucide-react"

import type { TicketAttachment } from "@/components/tickets/types"
import { formatFileSize } from "@/lib/tickets/format"
import { Button } from "@/components/ui/button"

export function AttachmentPreviewList({
  attachments,
  onRemove,
}: {
  attachments: TicketAttachment[]
  onRemove?: (id: string) => void
}) {
  if (attachments.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="group/attachment relative flex items-center gap-2 overflow-hidden rounded-lg border bg-muted/40 pr-2"
        >
          {att.kind === "image" ? (
            <Image
              src={att.url}
              alt={att.name}
              width={40}
              height={40}
              className="size-10 shrink-0 object-cover"
              unoptimized
            />
          ) : att.kind === "video" ? (
            <div className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
              <VideoIcon className="size-4" />
            </div>
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
              <FileTextIcon className="size-4" />
            </div>
          )}
          <div className="flex min-w-0 flex-col py-1 text-xs">
            <span className="max-w-36 truncate font-medium">{att.name}</span>
            <span className="text-muted-foreground">
              {formatFileSize(att.size)}
            </span>
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="ml-1 shrink-0 opacity-0 transition-opacity group-hover/attachment:opacity-100"
              onClick={() => onRemove(att.id)}
            >
              <XIcon />
              <span className="sr-only">Remover anexo</span>
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
