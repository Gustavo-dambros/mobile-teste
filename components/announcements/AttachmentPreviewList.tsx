"use client"

import Image from "next/image"
import { FileTextIcon, VideoIcon, XIcon } from "lucide-react"

import type { AnnouncementAttachment } from "@/components/announcements/types"
import { formatFileSize } from "@/lib/tickets/format"
import { Button } from "@/components/ui/button"

const KIND_LABELS: Record<AnnouncementAttachment["kind"], string> = {
  image: "Fotos",
  video: "Vídeos",
  document: "Documentos",
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: AnnouncementAttachment
  onRemove?: (id: string) => void
}) {
  return (
    <div className="group/attachment relative flex items-center gap-2 overflow-hidden rounded-lg border bg-muted/40 pr-2">
      {attachment.kind === "image" ? (
        <Image
          src={attachment.url}
          alt={attachment.name}
          width={40}
          height={40}
          className="size-10 shrink-0 object-cover"
          unoptimized
        />
      ) : attachment.kind === "video" ? (
        <div className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
          <VideoIcon className="size-4" />
        </div>
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
          <FileTextIcon className="size-4" />
        </div>
      )}
      <div className="flex min-w-0 flex-col py-1 text-xs">
        <span className="max-w-36 truncate font-medium">{attachment.name}</span>
        <span className="text-muted-foreground">{formatFileSize(attachment.size)}</span>
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-1 shrink-0 opacity-0 transition-opacity group-hover/attachment:opacity-100"
          onClick={() => onRemove(attachment.id)}
        >
          <XIcon />
          <span className="sr-only">Remover anexo</span>
        </Button>
      )}
    </div>
  )
}

/** Groups attachments by kind (fotos/vídeos/documentos) for clearer review before publishing. */
export function AttachmentPreviewList({
  attachments,
  onRemove,
}: {
  attachments: AnnouncementAttachment[]
  onRemove?: (id: string) => void
}) {
  if (attachments.length === 0) return null

  const groups = (["image", "video", "document"] as const)
    .map((kind) => ({ kind, items: attachments.filter((a) => a.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((group) => (
        <div key={group.kind} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {KIND_LABELS[group.kind]} ({group.items.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {group.items.map((attachment) => (
              <AttachmentChip
                key={attachment.id}
                attachment={attachment}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
