import { z } from "zod"

export const userRoleSchema = z.enum(["ADMIN", "USER"])
export type UserRole = z.infer<typeof userRoleSchema>

export const userStatusSchema = z.enum(["ACTIVE", "BLOCKED"])
export type UserStatus = z.infer<typeof userStatusSchema>

export const accessRequestStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"])
export type AccessRequestStatus = z.infer<typeof accessRequestStatusSchema>

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

export const roleItems: { label: string; value: UserRole }[] = [
  { label: "Administrador", value: "ADMIN" },
  { label: "Usuário", value: "USER" },
]

export const userStatusItems: { label: string; value: UserStatus }[] = [
  { label: "Ativo", value: "ACTIVE" },
  { label: "Bloqueado", value: "BLOCKED" },
]

export const requestStatusItems: { label: string; value: AccessRequestStatus }[] = [
  { label: "Pendente", value: "PENDING" },
  { label: "Aprovada", value: "APPROVED" },
  { label: "Rejeitada", value: "REJECTED" },
]

export const leaderFilterItems = [
  { label: "Líder", value: "leader" },
  { label: "Não líder", value: "not-leader" },
]

export type DateSort = "recent" | "oldest"
