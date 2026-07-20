"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  DownloadIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  PaperclipIcon,
  SquareArrowOutUpRightIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
  VideoIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { formatFileSize } from "@/lib/tickets/format"
import { ACCEPTED_ATTACHMENT_TYPES, validateFile } from "@/lib/kanban/upload"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanAttachment, KanbanAttachmentKind, KanbanCard } from "@/components/kanban/types"
import { EmptyAttachmentsState } from "@/components/kanban/StateViews"
import { Button } from "@/components/ui/button"

const KIND_ICON: Record<KanbanAttachmentKind, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: VideoIcon,
  audio: FileIcon,
  pdf: FileTextIcon,
  document: FileTextIcon,
  spreadsheet: FileSpreadsheetIcon,
  archive: FileArchiveIcon,
  other: FileIcon,
}

interface PendingUpload {
  id: string
  file: File
}

function AttachmentRow({ attachment, cardId }: { attachment: KanbanAttachment; cardId: string }) {
  const { removeAttachment, setCoverAttachment } = useKanban()
  const Icon = KIND_ICON[attachment.kind]

  async function handleRemove() {
    const result = await removeAttachment(attachment.id, cardId)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível remover o anexo")
      return
    }
    toast.success("Anexo removido")
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg border p-2">
      {attachment.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.storageUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
      ) : attachment.kind === "video" ? (
        <video src={attachment.storageUrl} className="size-10 shrink-0 rounded-md object-cover" muted />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{attachment.originalName}</span>
        <span className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)} · {new Date(attachment.createdAt).toLocaleDateString("pt-BR")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {attachment.kind === "image" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setCoverAttachment(cardId, attachment.isCover ? null : attachment.id)}
            aria-pressed={attachment.isCover}
            className={cn(attachment.isCover && "text-amber-500")}
          >
            <StarIcon className={cn(attachment.isCover && "fill-current")} />
            <span className="sr-only">Definir como capa</span>
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon-sm" render={<a href={attachment.storageUrl} target="_blank" rel="noreferrer" />}>
          <SquareArrowOutUpRightIcon />
          <span className="sr-only">Abrir {attachment.originalName}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          render={<a href={attachment.storageUrl} download={attachment.originalName} />}
        >
          <DownloadIcon />
          <span className="sr-only">Baixar {attachment.originalName}</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleRemove}>
          <Trash2Icon />
          <span className="sr-only">Remover {attachment.originalName}</span>
        </Button>
      </div>
    </div>
  )
}

export function KanbanAttachments({ card }: { card: KanbanCard }) {
  const { getAttachmentsForCard, loadAttachmentsForCard, addAttachments } = useKanban()
  const attachments = getAttachmentsForCard(card.id)
  const [pending, setPending] = React.useState<PendingUpload[]>([])
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    void loadAttachmentsForCard(card.id)
  }, [card.id, loadAttachmentsForCard])

  function handleFiles(files: FileList | File[]) {
    const toUpload: File[] = []
    for (const file of Array.from(files)) {
      const error = validateFile(file)
      if (error) {
        toast.error(error)
        continue
      }
      toUpload.push(file)
    }
    if (toUpload.length === 0) return

    const entries = toUpload.map((file) => ({ id: crypto.randomUUID(), file }))
    setPending((prev) => [...prev, ...entries])
    addAttachments(card.id, toUpload)
      .then((result) => {
        if (!result.ok) toast.error(result.errors[0] ?? "Não foi possível enviar o arquivo")
        else toast.success(toUpload.length > 1 ? "Arquivos enviados" : "Arquivo enviado")
      })
      .finally(() => {
        const ids = new Set(entries.map((e) => e.id))
        setPending((prev) => prev.filter((p) => !ids.has(p.id)))
      })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center transition-colors",
          isDragOver && "border-primary bg-primary/5"
        )}
      >
        <UploadIcon className="size-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Arraste arquivos aqui ou</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_TYPES}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <PaperclipIcon data-icon="inline-start" />
          Selecionar arquivos
        </Button>
      </div>

      {pending.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5 rounded-lg border p-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <PaperclipIcon className="size-4 animate-pulse text-muted-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-medium">{p.file.name}</span>
            <span className="text-xs text-muted-foreground">Enviando...</span>
          </div>
        </div>
      ))}

      {attachments.length === 0 && pending.length === 0 ? (
        <EmptyAttachmentsState />
      ) : (
        attachments.map((attachment) => <AttachmentRow key={attachment.id} attachment={attachment} cardId={card.id} />)
      )}
    </div>
  )
}
