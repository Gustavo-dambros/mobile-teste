"use client"

import { DownloadIcon, FileTextIcon, PlayIcon } from "lucide-react"

import type { TicketAttachment } from "@/components/tickets/types"
import { formatFileSize } from "@/lib/tickets/format"

export function MessageAttachments({
  attachments,
  onPreview,
}: {
  attachments: TicketAttachment[]
  onPreview: (attachment: TicketAttachment) => void
}) {
  if (attachments.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      {attachments.map((att) => {
        if (att.kind === "image") {
          return (
            <button
              key={att.id}
              type="button"
              onClick={() => onPreview(att)}
              className="block max-w-64 cursor-zoom-in overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={att.url}
                alt={att.name}
                className="max-h-72 w-full object-cover"
              />
            </button>
          )
        }
        if (att.kind === "video") {
          return (
            <button
              key={att.id}
              type="button"
              onClick={() => onPreview(att)}
              className="group/video relative block max-w-64 cursor-zoom-in overflow-hidden rounded-lg"
            >
              <video src={att.url} className="max-h-72 w-full object-cover" muted />
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover/video:bg-black/35">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black">
                  <PlayIcon className="size-5 fill-current" />
                </span>
              </span>
            </button>
          )
        }
        return (
          <a
            key={att.id}
            href={att.url}
            download={att.name}
            className="flex max-w-64 items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-2 text-xs transition-colors hover:bg-background"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileTextIcon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{att.name}</span>
              <span className="text-muted-foreground">
                {formatFileSize(att.size)}
              </span>
            </span>
            <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
          </a>
        )
      })}
    </div>
  )
}
