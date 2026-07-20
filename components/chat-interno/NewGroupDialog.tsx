"use client"

import * as React from "react"
import { toast } from "sonner"

import { useChatInterno } from "@/lib/chat-interno/store"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { RosterMultiSelect } from "@/components/chat-interno/RosterMultiSelect"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function NewGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (conversationId: string) => void
}) {
  const { createGroup } = useChatInterno()
  const roster = useChatRoster()
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [memberIds, setMemberIds] = React.useState<string[]>([])

  const dialogKey = open ? "open" : null
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  if (open && dialogKey !== loadedKey) {
    setLoadedKey(dialogKey)
    setName("")
    setDescription("")
    setMemberIds([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await createGroup({ name, description, memberIds })
    if (!result.ok || !result.conversation) {
      toast.error(result.error ?? "Não foi possível criar o grupo")
      return
    }
    toast.success("Grupo criado")
    onOpenChange(false)
    onCreated(result.conversation.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo grupo</DialogTitle>
          <DialogDescription>Escolha um nome e os colaboradores que vão participar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="group-name">Nome do grupo</FieldLabel>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Projeto Dashboard"
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="group-description">Descrição</FieldLabel>
            <Textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="max-h-24"
            />
          </Field>
          <Field>
            <FieldLabel>Participantes</FieldLabel>
            <RosterMultiSelect
              value={memberIds}
              onChange={setMemberIds}
              options={roster}
              placeholder="Selecionar colaboradores"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar grupo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
