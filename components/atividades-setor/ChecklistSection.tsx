"use client"

import * as React from "react"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export function ChecklistSection({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const { getChecklist, loadChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem } =
    useAtividadesSetor()
  const [text, setText] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    void loadChecklist(taskId)
  }, [taskId, loadChecklist])

  const items = getChecklist(taskId)
  const doneCount = items.filter((i) => i.done).length
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setSubmitting(true)
    const result = await addChecklistItem(taskId, value)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível adicionar o item")
      return
    }
    setText("")
  }

  if (items.length === 0 && !canEdit) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Checklist</span>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount}/{items.length} · {progress}%
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className="group/checklist-item flex items-center gap-2 py-0.5">
            <Checkbox
              checked={item.done}
              disabled={!canEdit}
              onCheckedChange={(checked) => void toggleChecklistItem(taskId, item.id, checked === true)}
            />
            <span
              className={
                item.done
                  ? "flex-1 text-sm text-muted-foreground line-through"
                  : "flex-1 text-sm text-foreground"
              }
            >
              {item.text}
            </span>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="opacity-0 transition-opacity group-hover/checklist-item:opacity-100"
                onClick={() => void deleteChecklistItem(taskId, item.id)}
              >
                <Trash2Icon />
                <span className="sr-only">Remover item</span>
              </Button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Adicionar item..."
            className="h-8 text-sm"
          />
          <Button type="submit" variant="outline" size="icon-sm" disabled={submitting || !text.trim()}>
            <PlusIcon />
            <span className="sr-only">Adicionar</span>
          </Button>
        </form>
      )}
    </div>
  )
}
