"use client"

import * as React from "react"
import { toast } from "sonner"
import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Ticket } from "@/components/tickets/types"
import { useTickets } from "@/lib/tickets/store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

function Stars({
  value,
  onChange,
  readOnly,
}: {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
}) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const display = hovered ?? value
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={cn("p-0.5", readOnly ? "cursor-default" : "cursor-pointer")}
        >
          <StarIcon
            className={cn(
              "size-5",
              star <= display ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  )
}

/** Shown to the requester once their ticket is closed — one-time rating, enforced server-side. */
export function SatisfactionSurvey({ ticket }: { ticket: Ticket }) {
  const { submitSatisfaction } = useTickets()
  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  if (ticket.satisfactionRating) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1.5 border-t bg-muted/30 px-4 py-3 text-center">
        <span className="text-sm text-muted-foreground">Você avaliou este atendimento</span>
        <Stars value={ticket.satisfactionRating} readOnly />
        {ticket.satisfactionComment && (
          <p className="max-w-md text-xs text-muted-foreground italic">“{ticket.satisfactionComment}”</p>
        )}
      </div>
    )
  }

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("Selecione uma nota antes de enviar")
      return
    }
    setSubmitting(true)
    const result = await submitSatisfaction(ticket.id, rating, comment.trim() || undefined)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível enviar a avaliação")
      return
    }
    toast.success("Obrigado pela avaliação!")
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 border-t bg-muted/30 px-4 py-3">
      <span className="text-sm font-medium">Como foi seu atendimento?</span>
      <Stars value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentário (opcional)"
        rows={2}
        className="max-w-md text-sm"
      />
      <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting || rating === 0}>
        Enviar avaliação
      </Button>
    </div>
  )
}
