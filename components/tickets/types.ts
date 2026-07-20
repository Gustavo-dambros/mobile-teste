export type TicketStatus = "Aberto" | "Em andamento" | "Concluído"

export type TicketPriority = "Alta" | "Média" | "Baixa"

export type TicketSector =
  | "SP-Suporte Técnico"
  | "RH-Recursos Humanos"
  | "ADM-Administração"
  | "SEP-Serviços Escola Psicologia"

export type AttachmentKind = "image" | "video" | "document"

export interface TicketAttachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
  mimeType: string
  /**
   * Local preview URL (created via URL.createObjectURL on the real File
   * picked from disk). Once a backend exists, this becomes the storage URL
   * returned by the upload endpoint — see lib/tickets/upload.ts.
   */
  url: string
}

export type MessageStatus = "sent" | "delivered" | "seen"

export interface TicketMessage {
  id: string
  ticketId: string
  kind: "message" | "system"
  authorId: string
  authorName: string
  isOwn: boolean
  text: string
  createdAt: string
  editedAt?: string
  deletedForEveryone?: boolean
  deletedForMe?: boolean
  status?: MessageStatus
  attachments?: TicketAttachment[]
  replyToId?: string
  /** Marks a system message as representing a ticket closure, for highlighted styling. */
  systemEvent?: "closed"
}

export type TicketHistoryEventType =
  | "created"
  | "status_changed"
  | "sector_changed"
  | "title_changed"
  | "description_changed"
  | "closed"
  | "deleted"

export interface TicketHistoryEvent {
  id: string
  ticketId: string
  type: TicketHistoryEventType
  actorName: string
  createdAt: string
  description: string
}

export interface Ticket {
  id: string
  number: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  sector: TicketSector
  requesterId: string
  requesterName: string
  /** Profile id of the staff member handling the ticket. Null means unassigned. */
  assigneeId: string | null
  /** Staff member handling the ticket. Empty string means unassigned. */
  assignee: string
  closedById?: string
  closedByName?: string
  closeReason?: string
  deleted?: boolean
  deleteReason?: string
  attachments: TicketAttachment[]
  createdAt: string
  updatedAt: string
  /** Timestamp of the first message from anyone other than the requester — the SLA "time to first response" marker. Unset while the ticket is still waiting on staff. */
  firstResponseAt?: string
  satisfactionRating?: number
  satisfactionComment?: string
}

export interface CannedResponse {
  id: string
  title: string
  body: string
  /** undefined = visible to every sector. */
  sector?: string
  createdById: string
  createdByName: string
  createdAt: string
  updatedAt: string
}
