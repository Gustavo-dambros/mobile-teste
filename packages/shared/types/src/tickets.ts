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
  assigneeId: string | null
  assignee: string
  closedById?: string
  closedByName?: string
  closeReason?: string
  deleted?: boolean
  deleteReason?: string
  attachments: TicketAttachment[]
  createdAt: string
  updatedAt: string
  firstResponseAt?: string
  satisfactionRating?: number
  satisfactionComment?: string
}

export interface CannedResponse {
  id: string
  title: string
  body: string
  sector?: string
  createdById: string
  createdByName: string
  createdAt: string
  updatedAt: string
}
