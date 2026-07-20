"use client"

import * as React from "react"
import { toast } from "sonner"
import { ListChecksIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useKanban } from "@/lib/kanban/store"
import type {
  KanbanCard,
  KanbanChecklist as KanbanChecklistType,
  KanbanChecklistItem as KanbanChecklistItemType,
} from "@/components/kanban/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export function KanbanChecklistItem({ item }: { item: KanbanChecklistItemType }) {
  const { toggleChecklistItem, updateChecklistItem, deleteChecklistItem } = useKanban()
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(item.title)

  function handleSave() {
    if (!value.trim()) {
      setValue(item.title)
      setEditing(false)
      return
    }
    updateChecklistItem(item.id, value.trim())
    setEditing(false)
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
      <Checkbox
        checked={item.isCompleted}
        onCheckedChange={() => toggleChecklistItem(item.id)}
        aria-label={`Marcar item "${item.title}" como concluído`}
      />
      {editing ? (
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setValue(item.title)
              setEditing(false)
            }
          }}
          className="h-7 flex-1"
          aria-label="Editar item do checklist"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 truncate rounded px-0.5 text-left text-sm",
            item.isCompleted && "text-muted-foreground line-through"
          )}
        >
          {item.title}
        </button>
      )}
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="shrink-0 opacity-0 group-hover:opacity-100"
        onClick={() => deleteChecklistItem(item.id)}
      >
        <Trash2Icon />
        <span className="sr-only">Excluir item {item.title}</span>
      </Button>
    </div>
  )
}

function ChecklistBlock({ checklist }: { checklist: KanbanChecklistType }) {
  const { getChecklistItems, createChecklistItem, deleteChecklist, updateChecklist } = useKanban()
  const items = getChecklistItems(checklist.id)
  const completed = items.filter((i) => i.isCompleted).length
  const [isAdding, setIsAdding] = React.useState(false)
  const [newItem, setNewItem] = React.useState("")
  const [editingTitle, setEditingTitle] = React.useState(false)
  const [titleValue, setTitleValue] = React.useState(checklist.title)

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    createChecklistItem(checklist.id, newItem.trim())
    setNewItem("")
  }

  function handleSaveTitle() {
    if (!titleValue.trim()) {
      setTitleValue(checklist.title)
      setEditingTitle(false)
      return
    }
    updateChecklist(checklist.id, titleValue.trim())
    setEditingTitle(false)
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <ListChecksIcon className="size-4 shrink-0 text-muted-foreground" />
        {editingTitle ? (
          <Input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            className="h-7 flex-1"
            aria-label="Renomear checklist"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="flex-1 truncate rounded px-0.5 text-left text-sm font-medium"
          >
            {checklist.title}
          </button>
        )}
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={async () => {
            const result = await deleteChecklist(checklist.id)
            if (!result.ok) {
              toast.error(result.error ?? "Não foi possível excluir o checklist")
              return
            }
            toast.success("Checklist excluído")
          }}
        >
          <Trash2Icon />
          <span className="sr-only">Excluir checklist {checklist.title}</span>
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(completed / items.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {completed} de {items.length} concluídos
          </span>
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <KanbanChecklistItem key={item.id} item={item} />
        ))}
      </div>
      {isAdding ? (
        <form onSubmit={handleAddItem} className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Adicionar item"
            aria-label="Novo item do checklist"
            onKeyDown={(e) => e.key === "Escape" && setIsAdding(false)}
          />
          <Button type="submit" size="sm">
            Adicionar
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          onClick={() => setIsAdding(true)}
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar item
        </Button>
      )}
    </div>
  )
}

export function KanbanChecklist({ card }: { card: KanbanCard }) {
  const { getChecklistsForCard, loadChecklistsForCard, createChecklist } = useKanban()
  const checklists = getChecklistsForCard(card.id)
  const [isAdding, setIsAdding] = React.useState(false)
  const [title, setTitle] = React.useState("")

  React.useEffect(() => {
    void loadChecklistsForCard(card.id)
  }, [card.id, loadChecklistsForCard])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setIsAdding(false)
      return
    }
    const result = await createChecklist(card.id, title.trim())
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível criar o checklist")
      return
    }
    setTitle("")
    setIsAdding(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {checklists.map((checklist) => (
        <ChecklistBlock key={checklist.id} checklist={checklist} />
      ))}
      {isAdding ? (
        <form onSubmit={handleAdd} className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do checklist"
            aria-label="Nome do novo checklist"
            onKeyDown={(e) => e.key === "Escape" && setIsAdding(false)}
          />
          <Button type="submit" size="sm">
            Adicionar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setIsAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          Adicionar checklist
        </Button>
      )}
    </div>
  )
}
