"use client"

import type { ComponentType } from "react"
import Image from "next/image"
import { FileTextIcon, VideoIcon, XIcon } from "lucide-react"

import type { ActivityAttachment, AttachmentKind } from "@/components/atividades-setor/types"
import { formatFileSize } from "@/lib/tickets/format"
import { Button } from "@/components/ui/button"

const KIND_LABELS: Record<AttachmentKind, string> = {
  image: "Imagens",
  video: "Vídeos",
  document: "Documentos",
}

const KIND_ICONS: Record<Exclude<AttachmentKind, "image">, ComponentType<{ className?: string }>> = {
  video: VideoIcon,
  document: FileTextIcon,
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ActivityAttachment
  onRemove?: (id: string) => void
}) {
  const Icon = attachment.kind !== "image" ? KIND_ICONS[attachment.kind] : null
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
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
          {Icon && <Icon className="size-4" />}
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

/** Grouped by kind so a reviewer can scan what's attached before publishing. */
export function AttachmentPreviewList({
  attachments,
  onRemove,
}: {
  attachments: ActivityAttachment[]
  onRemove?: (id: string) => void
}) {
  if (attachments.length === 0) return null

  const groups = (Object.keys(KIND_LABELS) as AttachmentKind[])
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
              <AttachmentChip key={attachment.id} attachment={attachment} onRemove={onRemove} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
