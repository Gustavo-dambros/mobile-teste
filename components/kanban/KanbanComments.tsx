"use client"

import * as React from "react"
import { toast } from "sonner"
import { PencilIcon, Trash2Icon } from "lucide-react"

import { formatDateTime } from "@/lib/tickets/format"
import { useCurrentUser } from "@/lib/current-user/context"
import { useKanban } from "@/lib/kanban/store"
import type { KanbanCard } from "@/components/kanban/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function KanbanComments({ card }: { card: KanbanCard }) {
  const { getCommentsForCard, loadCommentsForCard, addComment, editComment, deleteComment } = useKanban()
  const currentUser = useCurrentUser()
  const comments = getCommentsForCard(card.id)
  const [text, setText] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")

  React.useEffect(() => {
    void loadCommentsForCard(card.id)
  }, [card.id, loadCommentsForCard])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const result = await addComment(card.id, text)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível comentar")
      return
    }
    setText("")
  }

  async function handleSaveEdit(id: string) {
    if (!editValue.trim()) {
      setEditingId(null)
      return
    }
    const result = await editComment(id, editValue)
    if (!result.ok) toast.error(result.error ?? "Não foi possível editar o comentário")
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={2}
          aria-label="Novo comentário"
        />
        <Button type="submit" size="sm" className="self-end" disabled={!text.trim()}>
          Comentar
        </Button>
      </form>
      <div className="flex flex-col gap-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            <Avatar size="sm" className="mt-0.5 shrink-0">
              <AvatarFallback>{(currentUser?.name ?? "?").charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{currentUser?.name ?? "Usuário"}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                  {comment.editedAt && " · editado"}
                </span>
              </div>
              {editingId === comment.id ? (
                <div className="flex flex-col gap-1.5">
                  <Textarea autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={2} />
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" onClick={() => handleSaveEdit(comment.id)}>
                      Salvar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              )}
              {editingId !== comment.id && (
                <div className="flex gap-1 pt-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setEditingId(comment.id)
                      setEditValue(comment.content)
                    }}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={async () => {
                      const result = await deleteComment(comment.id, card.id)
                      if (!result.ok) {
                        toast.error(result.error ?? "Não foi possível excluir o comentário")
                        return
                      }
                      toast.success("Comentário excluído")
                    }}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
