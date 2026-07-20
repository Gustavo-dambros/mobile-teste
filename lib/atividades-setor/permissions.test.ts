import { describe, expect, it } from "vitest"

import {
  canArchiveTask,
  canChangeTaskStatus,
  canEditEvent,
  canEditTask,
  canRestoreTask,
  canViewEvent,
  canViewTask,
  getUserRole,
  isSystemAdmin,
  managesSector,
  type PermissionUser,
} from "@/lib/atividades-setor/permissions"

function user(overrides: Partial<PermissionUser> = {}): PermissionUser {
  return {
    id: "user-1",
    role: "USER",
    sector: "SP-Suporte Técnico",
    isSectorLeader: false,
    ...overrides,
  }
}

describe("isSystemAdmin", () => {
  it("is true only for ADMIN role", () => {
    expect(isSystemAdmin(user({ role: "ADMIN" }))).toBe(true)
    expect(isSystemAdmin(user({ role: "USER" }))).toBe(false)
  })
})

describe("managesSector", () => {
  it("admin manages every sector regardless of their own sector", () => {
    const admin = user({ role: "ADMIN", sector: "RH-Recursos Humanos" })
    expect(managesSector(admin, "SP-Suporte Técnico")).toBe(true)
  })

  it("sector leader manages only their own sector", () => {
    const leader = user({ sector: "SP-Suporte Técnico", isSectorLeader: true })
    expect(managesSector(leader, "SP-Suporte Técnico")).toBe(true)
    expect(managesSector(leader, "RH-Recursos Humanos")).toBe(false)
  })

  it("a plain member of the sector does not manage it", () => {
    const member = user({ sector: "SP-Suporte Técnico", isSectorLeader: false })
    expect(managesSector(member, "SP-Suporte Técnico")).toBe(false)
  })
})

describe("getUserRole", () => {
  it("maps admin/leader/plain user to the three display roles", () => {
    expect(getUserRole(user({ role: "ADMIN" }))).toBe("admin")
    expect(getUserRole(user({ isSectorLeader: true }))).toBe("gestor")
    expect(getUserRole(user())).toBe("colaborador")
  })
})

describe("canEditTask / canDeleteTask", () => {
  it("only the creator or an admin can edit", () => {
    const creator = user({ id: "creator-1" })
    const someoneElse = user({ id: "other-1" })
    const admin = user({ id: "admin-1", role: "ADMIN" })

    expect(canEditTask(creator, { creatorId: "creator-1" })).toBe(true)
    expect(canEditTask(admin, { creatorId: "creator-1" })).toBe(true)
    expect(canEditTask(someoneElse, { creatorId: "creator-1" })).toBe(false)
  })
})

describe("canArchiveTask", () => {
  it("requires managing the task's sector, not just editing rights", () => {
    const creatorNotLeader = user({ id: "creator-1", sector: "SP-Suporte Técnico", isSectorLeader: false })
    const leader = user({ sector: "SP-Suporte Técnico", isSectorLeader: true })

    expect(canArchiveTask(creatorNotLeader, { sector: "SP-Suporte Técnico" })).toBe(false)
    expect(canArchiveTask(leader, { sector: "SP-Suporte Técnico" })).toBe(true)
  })
})

describe("canRestoreTask / canHardDeleteTask", () => {
  it("is admin-only, even for sector leaders", () => {
    const leader = user({ isSectorLeader: true })
    const admin = user({ role: "ADMIN" })
    expect(canRestoreTask(leader)).toBe(false)
    expect(canRestoreTask(admin)).toBe(true)
  })
})

describe("canChangeTaskStatus", () => {
  it("lets the assignee move their own card even outside sector management", () => {
    const assignee = user({ id: "assignee-1", sector: "RH-Recursos Humanos", isSectorLeader: false })
    expect(
      canChangeTaskStatus(assignee, { sector: "SP-Suporte Técnico", assigneeId: "assignee-1" })
    ).toBe(true)
  })

  it("blocks an unrelated same-sector member who isn't the assignee or a leader", () => {
    const bystander = user({ id: "bystander-1", sector: "SP-Suporte Técnico", isSectorLeader: false })
    expect(
      canChangeTaskStatus(bystander, { sector: "SP-Suporte Técnico", assigneeId: "assignee-1" })
    ).toBe(false)
  })
})

describe("canViewTask", () => {
  const baseTask = {
    sector: "SP-Suporte Técnico",
    creatorId: "creator-1",
    assigneeId: "assignee-1",
    watcherIds: ["watcher-1"],
  }

  it("grants access to assignee, creator, and watchers even outside the sector", () => {
    expect(canViewTask(user({ id: "assignee-1", sector: "RH" }), baseTask)).toBe(true)
    expect(canViewTask(user({ id: "creator-1", sector: "RH" }), baseTask)).toBe(true)
    expect(canViewTask(user({ id: "watcher-1", sector: "RH" }), baseTask)).toBe(true)
  })

  it("grants access to sector leaders/admins of the task's sector", () => {
    const leader = user({ id: "leader-1", sector: "SP-Suporte Técnico", isSectorLeader: true })
    expect(canViewTask(leader, baseTask)).toBe(true)
  })

  it("does NOT grant access to a same-sector member who is otherwise uninvolved — unlike events, sector membership alone isn't enough", () => {
    const bystander = user({ id: "bystander-1", sector: "SP-Suporte Técnico", isSectorLeader: false })
    expect(canViewTask(bystander, baseTask)).toBe(false)
  })
})

describe("canEditEvent / canDeleteEvent / canCancelEvent", () => {
  it("only the creator or an admin can edit", () => {
    expect(canEditEvent(user({ id: "creator-1" }), { creatorId: "creator-1" })).toBe(true)
    expect(canEditEvent(user({ id: "other-1" }), { creatorId: "creator-1" })).toBe(false)
    expect(canEditEvent(user({ role: "ADMIN" }), { creatorId: "creator-1" })).toBe(true)
  })
})

describe("canViewEvent", () => {
  const baseEvent = {
    sector: "SP-Suporte Técnico",
    creatorId: "creator-1",
    participantIds: ["participant-1"],
    invitedUserIds: ["invited-1"],
    invitedSectorIds: ["RH-Recursos Humanos"],
    visibility: "privado",
  }

  it("grants access to creator, participants, and directly invited users", () => {
    expect(canViewEvent(user({ id: "creator-1", sector: "outro" }), baseEvent)).toBe(true)
    expect(canViewEvent(user({ id: "participant-1", sector: "outro" }), baseEvent)).toBe(true)
    expect(canViewEvent(user({ id: "invited-1", sector: "outro" }), baseEvent)).toBe(true)
  })

  it("grants access to a member of a sector the event was invited to", () => {
    expect(canViewEvent(user({ id: "bystander-1", sector: "RH-Recursos Humanos" }), baseEvent)).toBe(true)
  })

  it("with visibility 'setor', also grants access to plain members of the owning sector", () => {
    const setorEvent = { ...baseEvent, visibility: "setor" }
    const member = user({ id: "bystander-1", sector: "SP-Suporte Técnico", isSectorLeader: false })
    expect(canViewEvent(member, setorEvent)).toBe(true)
  })

  it("denies an uninvolved user from an unrelated sector", () => {
    const stranger = user({ id: "stranger-1", sector: "ADM-Administração", isSectorLeader: false })
    expect(canViewEvent(stranger, baseEvent)).toBe(false)
  })
})
