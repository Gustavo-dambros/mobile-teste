import { z } from "zod"

// ─── Enums reutilizáveis ──────────────────────────────────────────

export const userRoleSchema = z.enum(["ADMIN", "USER"])
export type UserRole = z.infer<typeof userRoleSchema>

export const userStatusSchema = z.enum(["ACTIVE", "BLOCKED"])
export type UserStatus = z.infer<typeof userStatusSchema>

export const accessRequestStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"])
export type AccessRequestStatus = z.infer<typeof accessRequestStatusSchema>

// ─── POST /api/administracao/users — Criar usuário ────────────────

export const createAdminUserSchema = z.object({
  requestId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  sector: z.string().min(1),
  cpf: z.string().min(1),
  role: userRoleSchema,
  isSectorLeader: z.boolean(),
})

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>

// ─── PATCH /api/administracao/users/:id — Atualizar usuário ───────

export const updateAdminUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  sector: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  isSectorLeader: z.boolean().optional(),
})

export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>

// ─── Schemas de resposta (read) ───────────────────────────────────

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  sector: z.string(),
  cpf: z.string().nullable(),
  role: userRoleSchema,
  status: userStatusSchema,
  isSectorLeader: z.boolean(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
})

export type AdminUser = z.infer<typeof adminUserSchema>

export const accessRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  sector: z.string(),
  cpf: z.string(),
  status: accessRequestStatusSchema,
  createdAt: z.string(),
  approvedById: z.string().nullable(),
  approvedByName: z.string().nullable(),
  approvedAt: z.string().nullable(),
})

export type AccessRequest = z.infer<typeof accessRequestSchema>
