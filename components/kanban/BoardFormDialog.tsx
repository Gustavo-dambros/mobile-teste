"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { SWATCH_PALETTE } from "@/lib/kanban/constants"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanBoard } from "@/components/kanban/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function BoardFormDialog({
  open,
  onOpenChange,
  board,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  board?: KanbanBoard | null
}) {
  const { createBoard, updateBoard, setDefaultBoard } = useKanban()
  const isEditing = !!board

  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [color, setColor] = React.useState(SWATCH_PALETTE[0])
  const [isDefault, setIsDefault] = React.useState(false)

  // Reset the form fields whenever the dialog transitions to open, without a
  // useEffect — plain render-time state adjustment (React's documented
  // "adjusting state when a prop changes" pattern).
  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTitle(board?.title ?? "")
      setDescription(board?.description ?? "")
      setColor(board?.backgroundValue ?? SWATCH_PALETTE[0])
      setIsDefault(board?.isDefault ?? false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Informe um nome para o quadro")
      return
    }

    if (isEditing && board) {
      const result = await updateBoard(board.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        backgroundValue: color,
      })
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar o quadro")
        return
      }
      if (isDefault && !board.isDefault) await setDefaultBoard(board.id)
      toast.success("Quadro atualizado")
    } else {
      const result = await createBoard({
        title: title.trim(),
        description: description.trim() || undefined,
        backgroundValue: color,
        isDefault,
      })
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível criar o quadro")
        return
      }
      toast.success("Quadro criado")
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar quadro" : "Novo quadro"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do seu quadro pessoal."
              : "Crie um quadro para organizar suas atividades e sua rotina diária."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="board-title">Nome do quadro</FieldLabel>
            <Input
              id="board-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Minha rotina"
              autoFocus
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="board-description">Descrição (opcional)</FieldLabel>
            <Textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Do que se trata este quadro?"
              rows={2}
            />
          </Field>
          <Field>
            <FieldLabel>Cor do quadro</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {SWATCH_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Selecionar cor ${swatch}`}
                  aria-pressed={color === swatch}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-background transition-all",
                    color === swatch && "ring-foreground"
                  )}
                  style={{ backgroundColor: swatch }}
                >
                  {color === swatch && <CheckIcon className="size-3.5 text-white" />}
                </button>
              ))}
            </div>
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              id="board-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <FieldLabel htmlFor="board-default" className="font-normal">
              Definir como quadro principal
            </FieldLabel>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? "Salvar alterações" : "Criar quadro"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
