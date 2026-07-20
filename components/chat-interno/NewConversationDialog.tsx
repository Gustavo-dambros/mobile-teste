"use client"

import { useChatInterno } from "@/lib/chat-interno/store"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (conversationId: string) => void
}) {
  const { createDmConversation } = useChatInterno()
  const roster = useChatRoster()

  async function handleSelect(memberId: string) {
    const result = await createDmConversation(memberId)
    if (result.ok && result.conversation) {
      onOpenChange(false)
      onCreated(result.conversation.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>Escolha um colaborador cadastrado para iniciar o bate-papo.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Buscar colaborador..." />
          <CommandList className="max-h-80">
            <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
            <CommandGroup>
              {roster.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.name} ${m.sector}`}
                  onSelect={() => handleSelect(m.id)}
                >
                  <Avatar size="sm">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{m.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{m.sector}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
