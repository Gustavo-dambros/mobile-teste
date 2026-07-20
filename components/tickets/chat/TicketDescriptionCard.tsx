"use client"

import type { Ticket, TicketAttachment } from "@/components/tickets/types"
import { formatDateTime } from "@/lib/tickets/format"
import { Card, CardContent } from "@/components/ui/card"
import { MessageAttachments } from "@/components/tickets/chat/MessageAttachments"

export function TicketDescriptionCard({
  ticket,
  onPreviewAttachment,
}: {
  ticket: Ticket
  onPreviewAttachment: (attachment: TicketAttachment) => void
}) {
  return (
    <Card className="border-dashed bg-muted/30 shadow-none">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{ticket.title}</h2>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDateTime(ticket.createdAt)}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {ticket.description}
        </p>
        {ticket.attachments.length > 0 && (
          <MessageAttachments
            attachments={ticket.attachments}
            onPreview={onPreviewAttachment}
          />
        )}
      </CardContent>
    </Card>
  )
}
