"use client"

import { ArrowLeftIcon, InfoIcon, PhoneIcon, PinIcon, SearchIcon, VideoIcon } from "lucide-react"

import { useRosterMember } from "@/lib/chat-interno/use-roster"
import type { Conversation } from "@/lib/chat-interno/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function ConversationHeader({
  conversation,
  onBack,
  onOpenInfo,
  onStartCall,
  onSearch,
  onOpenPins,
  pinnedCount,
}: {
  conversation: Conversation
  onBack?: () => void
  onOpenInfo: () => void
  onStartCall: (kind: "audio" | "video") => void
  onSearch: () => void
  onOpenPins: () => void
  pinnedCount: number
}) {
  const isGroup = conversation.kind === "group"
  const otherMember = useRosterMember(!isGroup ? conversation.memberIds[0] : undefined)
  const title = isGroup ? (conversation.name ?? "Grupo") : (otherMember?.name ?? "Contato")
  const subtitle = isGroup
    ? `${conversation.memberIds.length + 1} participantes`
    : (otherMember?.sector ?? "")

  return (
    <div className="flex items-center gap-2 border-b p-3">
      {onBack && (
        <Button type="button" variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeftIcon />
          <span className="sr-only">Voltar</span>
        </Button>
      )}
      <button type="button" onClick={onOpenInfo} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Avatar>
          <AvatarFallback>{initials(title)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </button>
      {pinnedCount > 0 && (
        <Button type="button" variant="ghost" size="icon" className="relative" onClick={onOpenPins}>
          <PinIcon />
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[0.6rem]">
            {pinnedCount}
          </Badge>
          <span className="sr-only">Mensagens fixadas</span>
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" onClick={onSearch}>
        <SearchIcon />
        <span className="sr-only">Buscar mensagens</span>
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => onStartCall("audio")}>
        <PhoneIcon />
        <span className="sr-only">Ligar</span>
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => onStartCall("video")}>
        <VideoIcon />
        <span className="sr-only">Chamada de vídeo</span>
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onOpenInfo}>
        <InfoIcon />
        <span className="sr-only">Informações</span>
      </Button>
    </div>
  )
}
