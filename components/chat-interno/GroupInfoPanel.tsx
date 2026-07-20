"use client"

import * as React from "react"
import { toast } from "sonner"
import { LogOutIcon, PlusIcon, ShieldIcon, ShieldOffIcon, XIcon } from "lucide-react"

import { useCurrentUser } from "@/lib/current-user/context"
import { useChatInterno } from "@/lib/chat-interno/store"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { RosterMultiSelect } from "@/components/chat-interno/RosterMultiSelect"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function GroupInfoPanel({
  conversationId,
  open,
  onOpenChange,
  onLeft,
}: {
  conversationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeft: () => void
}) {
  const {
    getConversation,
    renameGroup,
    updateGroupDescription,
    addGroupMembers,
    removeGroupMember,
    toggleGroupAdmin,
    leaveGroup,
  } = useChatInterno()
  const currentUser = useCurrentUser()
  const roster = useChatRoster()
  const rosterById = React.useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster])
  const conversation = conversationId ? getConversation(conversationId) : undefined
  const isGroup = conversation?.kind === "group"

  const dialogKey = open && conversation && isGroup ? conversation.id : null
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  const [nameDraft, setNameDraft] = React.useState("")
  const [descDraft, setDescDraft] = React.useState("")
  const [addingMembers, setAddingMembers] = React.useState(false)
  const [newMemberIds, setNewMemberIds] = React.useState<string[]>([])

  if (open && conversation?.kind === "group" && dialogKey !== loadedKey) {
    setLoadedKey(dialogKey)
    setNameDraft(conversation.name ?? "")
    setDescDraft(conversation.description ?? "")
    setAddingMembers(false)
    setNewMemberIds([])
  }

  if (!conversation) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-sm" />
      </Sheet>
    )
  }

  const isAdmin = conversation.kind === "group" && !!currentUser && conversation.adminIds.includes(currentUser.id)

  async function handleNameBlur() {
    if (!conversation || conversation.kind !== "group") return
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== conversation.name) {
      const result = await renameGroup(conversation.id, trimmed)
      if (!result.ok) toast.error(result.error ?? "Não foi possível renomear")
    }
  }
  async function handleDescBlur() {
    if (!conversation || conversation.kind !== "group") return
    if (descDraft !== (conversation.description ?? "")) {
      const result = await updateGroupDescription(conversation.id, descDraft)
      if (!result.ok) toast.error(result.error ?? "Não foi possível atualizar a descrição")
    }
  }
  async function handleAddMembers() {
    if (!conversation || newMemberIds.length === 0) return
    const result = await addGroupMembers(conversation.id, newMemberIds)
    if (!result.ok) toast.error(result.error ?? "Não foi possível adicionar membros")
    setAddingMembers(false)
    setNewMemberIds([])
  }
  async function handleRemove(memberId: string) {
    if (!conversation) return
    const result = await removeGroupMember(conversation.id, memberId)
    if (!result.ok) toast.error(result.error ?? "Não foi possível remover")
  }
  async function handleToggleAdmin(memberId: string) {
    if (!conversation) return
    const result = await toggleGroupAdmin(conversation.id, memberId)
    if (!result.ok) toast.error(result.error ?? "Não foi possível alterar o admin")
  }
  async function handleLeave() {
    if (!conversation) return
    await leaveGroup(conversation.id)
    onOpenChange(false)
    onLeft()
  }

  if (!isGroup) {
    const member = rosterById.get(conversation.memberIds[0])
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Informações do contato</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center gap-2 px-4 pb-2">
            <Avatar size="lg" className="size-20">
              <AvatarFallback className="text-xl">{initials(member?.name ?? "?")}</AvatarFallback>
            </Avatar>
            <span className="text-base font-medium">{member?.name}</span>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 px-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Setor</span>
              <span>{member?.sector}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">E-mail</span>
              <span>{member?.email}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Telefone</span>
              <span>{member?.phone}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const memberEntries: { id: string; name: string; sector?: string; isAdmin: boolean; isMe: boolean }[] = [
    {
      id: currentUser?.id ?? "",
      name: currentUser?.name ?? "",
      isAdmin: !!currentUser && conversation.adminIds.includes(currentUser.id),
      isMe: true,
    },
    ...conversation.memberIds.map((id) => ({
      id,
      name: rosterById.get(id)?.name ?? "Alguém",
      sector: rosterById.get(id)?.sector,
      isAdmin: conversation.adminIds.includes(id),
      isMe: false,
    })),
  ]
  const addableMembers = roster.filter((m) => !conversation.memberIds.includes(m.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Informações do grupo</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col items-center gap-2">
            <Avatar size="lg" className="size-20">
              <AvatarFallback className="text-xl">{initials(conversation.name ?? "Grupo")}</AvatarFallback>
            </Avatar>
          </div>

          {isAdmin ? (
            <div className="flex flex-col gap-3">
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={handleNameBlur} />
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Descrição do grupo"
                rows={2}
                className="max-h-24"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-base font-medium">{conversation.name}</span>
              {conversation.description && (
                <span className="text-sm text-muted-foreground">{conversation.description}</span>
              )}
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Participantes ({memberEntries.length})</span>
              {isAdmin && !addingMembers && (
                <Button variant="ghost" size="icon-sm" onClick={() => setAddingMembers(true)}>
                  <PlusIcon />
                  <span className="sr-only">Adicionar participantes</span>
                </Button>
              )}
            </div>

            {addingMembers && (
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2">
                <RosterMultiSelect
                  value={newMemberIds}
                  onChange={setNewMemberIds}
                  options={addableMembers}
                  placeholder="Selecionar colaboradores"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAddingMembers(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAddMembers}>
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {memberEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 py-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(entry.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{entry.isMe ? "Você" : entry.name}</span>
                      {entry.sector && <span className="truncate text-xs text-muted-foreground">{entry.sector}</span>}
                    </div>
                    {entry.isAdmin && (
                      <Badge variant="secondary" className="shrink-0">
                        Admin
                      </Badge>
                    )}
                  </div>
                  {isAdmin && !entry.isMe && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleAdmin(entry.id)}
                        title={entry.isAdmin ? "Remover admin" : "Tornar admin"}
                      >
                        {entry.isAdmin ? <ShieldOffIcon className="size-3.5" /> : <ShieldIcon className="size-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(entry.id)}
                        title="Remover do grupo"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <Button variant="outline" className="justify-start text-destructive" onClick={handleLeave}>
            <LogOutIcon data-icon="inline-start" />
            Sair do grupo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
