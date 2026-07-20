"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { useChatInterno } from "@/lib/chat-interno/store"
import { formatTime } from "@/lib/tickets/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

/** Highlights the matched substring inside a snippet — case-insensitive, single match
 * per render is enough here since this is just a visual aid, not the search itself. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1 || !query) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary/20 text-foreground">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}

/**
 * Searches within the messages already loaded for this conversation — there's no
 * pagination in this module today (a conversation's full history loads up front, see
 * MessageList), so a server round-trip would just re-fetch the same list this already
 * has in memory. If pagination is added later, this is the piece that would need a
 * real GET /messages/search route instead.
 */
export function MessageSearchPanel({
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
  const { getMessagesFor } = useChatInterno()
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return getMessagesFor(conversationId)
      .filter((m) => m.kind !== "system" && !m.deletedForEveryone && !m.deletedForMe && m.text.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [getMessagesFor, conversationId, query])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Buscar mensagens</SheetTitle>
        </SheetHeader>
        <div className="border-b p-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite para buscar..."
              className="pl-8"
              autoFocus
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {query.trim() === "" ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Digite algo pra buscar nas mensagens desta conversa.
            </p>
          ) : results.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma mensagem encontrada.</p>
          ) : (
            results.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => onJumpToMessage(message.id)}
                className="flex items-start gap-2.5 border-b p-3 text-left hover:bg-muted/60"
              >
                <Avatar size="sm" className="mt-0.5 shrink-0">
                  <AvatarFallback>{initials(message.authorName)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {message.authorName}
                    <span className="font-normal text-muted-foreground">
                      {new Date(message.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} ·{" "}
                      {formatTime(message.createdAt)}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm text-foreground/90">
                    <Highlighted text={message.text} query={query} />
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
