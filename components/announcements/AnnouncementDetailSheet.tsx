"use client"

import * as React from "react"
import Image from "next/image"
import {
  CalendarIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  MegaphoneIcon,
  PencilIcon,
  PresentationIcon,
  ShieldOffIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"

import { formatDateTime, formatFileSize } from "@/lib/tickets/format"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { useAnnouncements } from "@/lib/announcements/store"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function formatEventDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function recipientsSummary(
  recipients: { mode: string; sectorIds: string[] },
  count: number
) {
  if (recipients.mode === "all") return `Todos os usuários (${count})`
  if (recipients.mode === "sectors") {
    return `Setores: ${recipients.sectorIds.join(", ")} (${count} pessoa(s))`
  }
  return `Pessoas específicas (${count})`
}

export function AnnouncementDetailSheet() {
  const {
    detailAnnouncementId,
    closeDetail,
    getAnnouncement,
    canManage,
    markViewed,
    openEditDialog,
    openDeleteConfirm,
    getHistory,
  } = useAnnouncements()

  const roster = useChatRoster()
  const announcement = detailAnnouncementId ? getAnnouncement(detailAnnouncementId) : undefined
  const notFound = !!detailAnnouncementId && !announcement

  React.useEffect(() => {
    if (announcement) markViewed(announcement.id)
    // Only re-run when the viewed announcement changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement?.id])

  const recipientMembers = announcement
    ? roster.filter((m) => announcement.recipientUserIds.includes(m.id))
    : []
  const history = announcement ? getHistory(announcement.id) : []
  const images = announcement?.attachments.filter((a) => a.kind === "image") ?? []
  const videos = announcement?.attachments.filter((a) => a.kind === "video") ?? []
  const documents = announcement?.attachments.filter((a) => a.kind === "document") ?? []

  const editable = announcement ? canManage(announcement) : false

  return (
    <Sheet open={!!detailAnnouncementId} onOpenChange={(open) => !open && closeDetail()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {notFound ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ShieldOffIcon className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium">Sem permissão para visualizar</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Você não foi selecionado como destinatário deste anúncio ou evento.
            </p>
          </div>
        ) : announcement ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge variant={announcement.type === "Evento" ? "default" : "secondary"}>
                  {announcement.type === "Evento" ? (
                    <PresentationIcon data-icon="inline-start" />
                  ) : (
                    <MegaphoneIcon data-icon="inline-start" />
                  )}
                  {announcement.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{announcement.number}</span>
              </div>
              <SheetTitle className="text-lg">{announcement.title}</SheetTitle>
              <SheetDescription className="whitespace-pre-wrap break-words text-foreground/80">
                {announcement.description || "Sem descrição."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  <span className="capitalize">{formatEventDate(announcement.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="size-4 text-muted-foreground" />
                  <span>{announcement.time}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Responsável</span>
                  <span className="flex items-center gap-2 font-medium">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(announcement.responsibleName)}</AvatarFallback>
                    </Avatar>
                    {announcement.responsibleName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Criado por</span>
                  <span className="flex items-center gap-2 font-medium">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(announcement.creatorName)}</AvatarFallback>
                    </Avatar>
                    {announcement.creatorName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{formatDateTime(announcement.createdAt)}</span>
                </div>
                {announcement.updatedAt !== announcement.createdAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última atualização</span>
                    <span>{formatDateTime(announcement.updatedAt)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  Destinatários
                </span>
                <p className="text-sm text-muted-foreground">
                  {recipientsSummary(announcement.recipients, recipientMembers.length)}
                </p>
                {recipientMembers.length > 0 && (
                  <AvatarGroup>
                    {recipientMembers.slice(0, 8).map((m) => (
                      <Avatar key={m.id} size="sm">
                        <AvatarFallback>{initials(m.name)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {recipientMembers.length > 8 && (
                      <AvatarGroupCount>+{recipientMembers.length - 8}</AvatarGroupCount>
                    )}
                  </AvatarGroup>
                )}
              </div>

              {images.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Fotos ({images.length})</span>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative aspect-square overflow-hidden rounded-lg border"
                        >
                          <Image
                            src={att.url}
                            alt={att.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {videos.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Vídeos ({videos.length})</span>
                    <div className="flex flex-col gap-2">
                      {videos.map((att) => (
                        <video
                          key={att.id}
                          src={att.url}
                          controls
                          className="w-full rounded-lg border"
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {documents.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Documentos ({documents.length})</span>
                    <div className="flex flex-col gap-2">
                      {documents.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <FileTextIcon className="size-4" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col text-xs">
                            <span className="truncate font-medium text-sm">{att.name}</span>
                            <span className="text-muted-foreground">
                              {att.mimeType || "Documento"} · {formatFileSize(att.size)}
                            </span>
                          </div>
                          <Button variant="outline" size="icon-sm" render={<a href={att.url} download={att.name} target="_blank" rel="noreferrer" />}>
                            <DownloadIcon />
                            <span className="sr-only">Baixar {att.name}</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {history.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Histórico de edição</span>
                    <div className="flex flex-col gap-1.5">
                      {history.map((h) => (
                        <div key={h.id} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{h.actorName}</span>{" "}
                          — {h.description} ({formatDateTime(h.createdAt)})
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!editable && (
                <p className="text-xs text-muted-foreground">
                  Somente o criador desta publicação pode editá-la ou excluí-la.
                </p>
              )}
            </div>

            {editable && (
              <SheetFooter className="flex-row justify-end gap-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => openDeleteConfirm(announcement.id)}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Excluir
                </Button>
                <Button onClick={() => openEditDialog(announcement.id)}>
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Button>
              </SheetFooter>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
