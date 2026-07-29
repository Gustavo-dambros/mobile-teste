import {
  userRoleSchema,
  userStatusSchema,
  accessRequestStatusSchema,
  adminUserSchema,
  accessRequestSchema,
  type UserRole,
  type UserStatus,
  type AccessRequestStatus,
  type AdminUser,
  type AccessRequest,
} from "@unipar/validation"

export {
  userRoleSchema,
  userStatusSchema,
  accessRequestStatusSchema,
  adminUserSchema,
  accessRequestSchema,
}
export type {
  UserRole,
  UserStatus,
  AccessRequestStatus,
  AdminUser,
  AccessRequest,
}

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
