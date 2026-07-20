export type SessionRole = "ADMIN" | "USER"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: SessionRole
  phone: string
  sector: string
  cpf: string
  presenceStatus: string
  workActivityStatus: string
  statusMessage: string
  isSectorLeader: boolean
}

export function isAdmin(user: SessionUser | null) {
  return user?.role === "ADMIN"
}
