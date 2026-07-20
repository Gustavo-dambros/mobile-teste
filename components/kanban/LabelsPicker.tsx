"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckIcon, PencilIcon, PlusIcon, TagIcon, Trash2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { SWATCH_PALETTE } from "@/lib/kanban/constants"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard } from "@/components/kanban/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"

export function LabelsPicker({ card }: { card: KanbanCard }) {
  const { labelsForUser, toggleCardLabel, createLabel, updateLabel, deleteLabel } = useKanban()
  const [creating, setCreating] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState(SWATCH_PALETTE[0])

  function resetCreateForm() {
    setCreating(false)
    setName("")
    setColor(SWATCH_PALETTE[0])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const result = await createLabel(name.trim(), color)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível criar a etiqueta")
      return
    }
    resetCreateForm()
  }

  function handleRename(e: React.FormEvent, id: string) {
    e.preventDefault()
    if (!name.trim()) {
      setEditingId(null)
      return
    }
    updateLabel(id, { name: name.trim() })
    setEditingId(null)
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <TagIcon data-icon="inline-start" />
        Etiquetas
        {card.labelIds.length > 0 && ` (${card.labelIds.length})`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <PopoverHeader>
          <PopoverTitle>Etiquetas</PopoverTitle>
        </PopoverHeader>
        <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
          {labelsForUser.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">Nenhuma etiqueta criada ainda.</p>
          )}
          {labelsForUser.map((label) => {
            const checked = card.labelIds.includes(label.id)
            if (editingId === label.id) {
              return (
                <form
                  key={label.id}
                  className="flex items-center gap-1 px-0.5 py-0.5"
                  onSubmit={(e) => handleRename(e, label.id)}
                >
                  <Input
                    autoFocus
                    defaultValue={label.name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-7"
                    aria-label="Nome da etiqueta"
                  />
                  <Button type="submit" size="icon-xs" variant="ghost">
                    <CheckIcon />
                    <span className="sr-only">Salvar</span>
                  </Button>
                </form>
              )
            }
            return (
              <div key={label.id} className="group flex items-center gap-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => toggleCardLabel(card.id, label.id)}
                  className="flex flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:brightness-95"
                  style={{ backgroundColor: `${label.color}22` }}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 truncate">{label.name}</span>
                  {checked && <CheckIcon className="size-3.5 shrink-0" />}
                </button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    setEditingId(label.id)
                    setName(label.name)
                  }}
                >
                  <PencilIcon />
                  <span className="sr-only">Editar etiqueta {label.name}</span>
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteLabel(label.id)}
                >
                  <Trash2Icon />
                  <span className="sr-only">Excluir etiqueta {label.name}</span>
                </Button>
              </div>
            )
          })}
        </div>

        {creating ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-2 border-t pt-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da etiqueta"
              aria-label="Nome da nova etiqueta"
            />
            <div className="flex flex-wrap gap-1.5">
              {SWATCH_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Cor ${swatch}`}
                  aria-pressed={color === swatch}
                  className={cn(
                    "size-5 rounded-full ring-2 ring-transparent ring-offset-1 ring-offset-popover",
                    color === swatch && "ring-foreground"
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Button type="submit" size="sm">
                Criar etiqueta
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetCreateForm}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Criar etiqueta
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
