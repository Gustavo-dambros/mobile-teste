"use client"

import * as React from "react"
import { toast } from "sonner"
import { MessageSquareTextIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { useCurrentUser } from "@/lib/current-user/context"
import { useTickets } from "@/lib/tickets/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"

export function CannedResponsesPopover({ onPick }: { onPick: (body: string) => void }) {
  const currentUser = useCurrentUser()
  const { cannedResponses, loadCannedResponses, createCannedResponse, deleteCannedResponse } = useTickets()
  const [open, setOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) void loadCannedResponses()
  }, [open, loadCannedResponses])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    const result = await createCannedResponse({ title: title.trim(), body: body.trim() })
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível criar a resposta pronta")
      return
    }
    setTitle("")
    setBody("")
    setCreating(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteCannedResponse(id)
    if (!result.ok) toast.error(result.error ?? "Não foi possível excluir")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="ghost" size="icon" className="shrink-0" />}>
        <MessageSquareTextIcon />
        <span className="sr-only">Respostas prontas</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Respostas prontas</span>
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => setCreating((v) => !v)}>
            <PlusIcon />
            <span className="sr-only">Nova resposta</span>
          </Button>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="flex flex-col gap-2 border-b p-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="h-8 text-sm" />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Texto da resposta..."
              rows={3}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={submitting || !title.trim() || !body.trim()}>
                Salvar
              </Button>
            </div>
          </form>
        )}

        <div className="max-h-72 overflow-y-auto">
          {cannedResponses.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma resposta pronta cadastrada.</p>
          ) : (
            cannedResponses.map((response) => (
              <div key={response.id} className="group/canned flex items-start gap-2 border-b p-2.5 last:border-0">
                <button
                  type="button"
                  onClick={() => {
                    onPick(response.body)
                    setOpen(false)
                  }}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                >
                  <span className="text-sm font-medium">{response.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{response.body}</span>
                </button>
                {(response.createdById === currentUser?.id || currentUser?.role === "ADMIN") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 transition-opacity group-hover/canned:opacity-100"
                    onClick={() => void handleDelete(response.id)}
                  >
                    <Trash2Icon />
                    <span className="sr-only">Excluir</span>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
