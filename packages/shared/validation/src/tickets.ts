import { z } from "zod"

// ─── Enums reutilizáveis ──────────────────────────────────────────

export const ticketSectorSchema = z.enum([
  "SP-Suporte Técnico",
  "RH-Recursos Humanos",
  "ADM-Administração",
  "SEP-Serviços Escola Psicologia",
])

export const ticketPrioritySchema = z.enum(["Alta", "Média", "Baixa"])

export const attachmentKindSchema = z.enum(["image", "video", "document"])

// ─── Schemas base ─────────────────────────────────────────────────

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  kind: attachmentKindSchema,
  mimeType: z.string(),
  url: z.string(),
})

export type AttachmentInput = z.infer<typeof attachmentSchema>

// ─── POST /api/tickets — Criar chamado ────────────────────────────

export const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  priority: ticketPrioritySchema,
  sector: ticketSectorSchema,
  attachments: z.array(attachmentSchema).default([]),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>

// ─── PATCH /api/tickets/:id — Atualizar chamado ───────────────────

export const updateTicketSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  sector: ticketSectorSchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
})

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>

// ─── POST /api/tickets/:id/messages — Enviar mensagem ─────────────

export const createTicketMessageSchema = z
  .object({
    text: z.string().default(""),
    replyToId: z.string().uuid().optional(),
    attachments: z.array(attachmentSchema).default([]),
  })
  .refine((data) => data.text.trim().length > 0 || data.attachments.length > 0, {
    message: "Envie um texto ou pelo menos um anexo",
  })

export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>

// ─── POST /api/tickets/:id/close — Encerrar chamado ──────────────

export const closeTicketSchema = z.object({
  reason: z.string().min(1),
})

export type CloseTicketInput = z.infer<typeof closeTicketSchema>

// ─── POST /api/tickets/:id/reopen — Reabrir chamado ──────────────

export const reopenTicketSchema = z.object({
  reason: z.string().min(1),
})

export type ReopenTicketInput = z.infer<typeof reopenTicketSchema>

// ─── POST /api/tickets/:id/satisfaction — Avaliar chamado ────────

export const satisfactionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
})

export type SatisfactionInput = z.infer<typeof satisfactionSchema>
