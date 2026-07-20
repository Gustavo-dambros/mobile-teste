import { describe, expect, it } from "vitest"

import { isAdmin, type SessionUser } from "@/lib/session"

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-1",
    name: "Fulano",
    email: "fulano@unipar.br",
    role: "USER",
    phone: "45999999999",
    sector: "SP-Suporte Técnico",
    cpf: "12345678900",
    presenceStatus: "ONLINE",
    workActivityStatus: "ONSITE",
    statusMessage: "",
    isSectorLeader: false,
    ...overrides,
  }
}

describe("isAdmin", () => {
  it("is true only for role ADMIN", () => {
    expect(isAdmin(user({ role: "ADMIN" }))).toBe(true)
    expect(isAdmin(user({ role: "USER" }))).toBe(false)
  })

  it("is false for null (logged-out state), not a throw", () => {
    expect(isAdmin(null)).toBe(false)
  })
})
