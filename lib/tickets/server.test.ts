import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SessionUser } from "@/lib/session"

const mockSingle = vi.fn()

// canAccessTicket calls createAdminClient() internally rather than taking it as
// a parameter, so the module itself has to be mocked to control what the
// "tickets" query returns for each case.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  }),
}))

const { canAccessTicket } = await import("@/lib/tickets/server")

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

beforeEach(() => {
  mockSingle.mockReset()
})

describe("canAccessTicket", () => {
  it("grants the requester access to their own ticket, even from a different sector", async () => {
    mockSingle.mockResolvedValue({
      data: { requester_id: "user-1", sector: "RH-Recursos Humanos", deleted: false },
    })
    const requester = user({ id: "user-1", sector: "SP-Suporte Técnico" })
    expect(await canAccessTicket(requester, "ticket-1")).toBe(true)
  })

  it("grants sector staff access to any ticket in their sector, even if they didn't open it", async () => {
    mockSingle.mockResolvedValue({
      data: { requester_id: "someone-else", sector: "SP-Suporte Técnico", deleted: false },
    })
    const staff = user({ id: "staff-1", sector: "SP-Suporte Técnico" })
    expect(await canAccessTicket(staff, "ticket-1")).toBe(true)
  })

  it("grants an admin access regardless of sector or requester", async () => {
    mockSingle.mockResolvedValue({
      data: { requester_id: "someone-else", sector: "RH-Recursos Humanos", deleted: false },
    })
    const admin = user({ id: "admin-1", role: "ADMIN", sector: "SP-Suporte Técnico" })
    expect(await canAccessTicket(admin, "ticket-1")).toBe(true)
  })

  it("denies a plain user from a different sector who didn't open the ticket", async () => {
    mockSingle.mockResolvedValue({
      data: { requester_id: "someone-else", sector: "RH-Recursos Humanos", deleted: false },
    })
    const outsider = user({ id: "outsider-1", sector: "SP-Suporte Técnico" })
    expect(await canAccessTicket(outsider, "ticket-1")).toBe(false)
  })

  it("denies access to a soft-deleted ticket even for its own requester", async () => {
    mockSingle.mockResolvedValue({
      data: { requester_id: "user-1", sector: "SP-Suporte Técnico", deleted: true },
    })
    const requester = user({ id: "user-1", sector: "SP-Suporte Técnico" })
    expect(await canAccessTicket(requester, "ticket-1")).toBe(false)
  })

  it("denies access when the ticket id doesn't resolve to a row", async () => {
    mockSingle.mockResolvedValue({ data: null })
    expect(await canAccessTicket(user(), "missing-ticket")).toBe(false)
  })
})
