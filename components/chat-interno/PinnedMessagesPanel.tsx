"use client"

import * as React from "react"
import { PinOffIcon } from "lucide-react"

import { useChatInterno } from "@/lib/chat-interno/store"
import { formatTime } from "@/lib/tickets/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function PinnedMessagesPanel({
  conversationId,
  open,
  onOpenChange,
  onJumpToMessage,
}: {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onJumpToMessage: (messageId: string) => void
}) {
  const { getPinnedMessagesFor, loadPinnedMessages, unpinMessage } = useChatInterno()
  const pins = getPinnedMessagesFor(conversationId)

  React.useEffect(() => {
    if (open) void loadPinnedMessages(conversationId)
  }, [open, conversationId, loadPinnedMessages])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Mensagens fixadas</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {pins.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma mensagem fixada nesta conversa.</p>
          ) : (
            pins.map((pin) => (
              <div key={pin.messageId} className="flex items-start gap-2.5 border-b p-3">
                <button
                  type="button"
                  onClick={() => onJumpToMessage(pin.messageId)}
                  className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                >
                  <Avatar size="sm" className="mt-0.5 shrink-0">
                    <AvatarFallback>{initials(pin.message?.authorName ?? "?")}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      {pin.message?.authorName ?? "Mensagem removida"}
                      {pin.message && (
                        <span className="font-normal text-muted-foreground">{formatTime(pin.message.createdAt)}</span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-sm text-foreground/90">
                      {pin.message?.deletedForEveryone
                        ? "Mensagem apagada"
                        : (pin.message?.text ?? (pin.message?.attachments.length ? "Anexo" : ""))}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      Fixada por {pin.pinnedByName} · {formatTime(pin.pinnedAt)}
                    </span>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0"
                  onClick={() => unpinMessage(conversationId, pin.messageId)}
                >
                  <PinOffIcon />
                  <span className="sr-only">Desafixar</span>
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
