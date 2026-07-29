import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock do apiFetch — verifica paths, métodos e body serializado
// ---------------------------------------------------------------------------

const mockApiFetch = vi.fn()

vi.mock("../api-fetch", () => ({
  apiFetch: mockApiFetch,
}))

// ---------------------------------------------------------------------------
// Subjects under test
// ---------------------------------------------------------------------------

const tickets = await import("../tickets")
const meetings = await import("../meetings")
const kanban = await import("../kanban")
const chat = await import("../chat")
const activities = await import("../activities")

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockApiFetch.mockReset()
})

/** Extrai o segundo argumento do mock (RequestInit) */
function lastCallInit() {
  return mockApiFetch.mock.calls[0][1] as RequestInit | undefined
}

function lastCallPath() {
  return mockApiFetch.mock.calls[0][0] as string
}

function lastCallBody() {
  const init = lastCallInit()
  return init?.body ? JSON.parse(init.body as string) : undefined
}

// ═══════════════════════════════════════════════════════════════════════════
// Tickets
// ═══════════════════════════════════════════════════════════════════════════

describe("tickets", () => {
  it("fetchTickets → GET /api/tickets", async () => {
    mockApiFetch.mockResolvedValueOnce([])
    await tickets.fetchTickets()

    expect(lastCallPath()).toBe("/api/tickets")
    expect(lastCallInit()).toBeUndefined()
  })

  it("fetchTicket → GET /api/tickets/{id}", async () => {
    mockApiFetch.mockResolvedValueOnce({} as never)
    await tickets.fetchTicket("ticket-123")

    expect(lastCallPath()).toBe("/api/tickets/ticket-123")
    expect(lastCallInit()).toBeUndefined()
  })

  it("createTicket → POST /api/tickets com body", async () => {
    const payload = { title: "Problema no PC", description: "Não liga", sector: "TI", priority: "alta" }
    mockApiFetch.mockResolvedValueOnce({} as never)
    await tickets.createTicket(payload)

    expect(lastCallPath()).toBe("/api/tickets")
    expect(mockApiFetch).toHaveBeenCalledWith("/api/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  })

  it("createTicket com attachments opcionais", async () => {
    const payload = {
      title: "Chamado com foto",
      description: "Veja anexo",
      sector: "TI",
      priority: "media",
      attachments: [{ id: "att-1", name: "foto.jpg", url: "https://...", size: 1024, kind: "image" as const }],
    }
    mockApiFetch.mockResolvedValueOnce({} as never)
    await tickets.createTicket(payload)

    expect(lastCallBody()).toEqual(payload)
  })

  it("updateTicket → PATCH /api/tickets/{id} com body parcial", async () => {
    mockApiFetch.mockResolvedValueOnce({ ticket: {} as never, messages: [] })
    await tickets.updateTicket("ticket-1", { sector: "RH", assigneeId: null })

    expect(lastCallPath()).toBe("/api/tickets/ticket-1")
    expect(mockApiFetch).toHaveBeenCalledWith("/api/tickets/ticket-1", {
      method: "PATCH",
      body: JSON.stringify({ sector: "RH", assigneeId: null }),
    })
  })

  it("closeTicket → POST /api/tickets/{id}/close com motivo", async () => {
    mockApiFetch.mockResolvedValueOnce({ ticket: {} as never, message: {} as never })
    await tickets.closeTicket("ticket-1", "Resolvido")

    expect(lastCallPath()).toBe("/api/tickets/ticket-1/close")
    expect(lastCallBody()).toEqual({ reason: "Resolvido" })
  })

  it("reopenTicket → POST /api/tickets/{id}/reopen com motivo", async () => {
    mockApiFetch.mockResolvedValueOnce({ ticket: {} as never, message: {} as never })
    await tickets.reopenTicket("ticket-1", "Problema voltou")

    expect(lastCallPath()).toBe("/api/tickets/ticket-1/reopen")
    expect(lastCallBody()).toEqual({ reason: "Problema voltou" })
  })

  it("deleteTicket → POST /api/tickets/{id}/delete com motivo", async () => {
    mockApiFetch.mockResolvedValueOnce({ ticket: {} as never })
    await tickets.deleteTicket("ticket-1", "Aberto por engano")

    expect(lastCallPath()).toBe("/api/tickets/ticket-1/delete")
    expect(lastCallBody()).toEqual({ reason: "Aberto por engano" })
  })

  it("rateTicket → POST /api/tickets/{id}/satisfaction com rating e comment opcional", async () => {
    mockApiFetch.mockResolvedValueOnce({ ticket: {} as never })
    await tickets.rateTicket("ticket-1", 5, "Ótimo!")

    expect(lastCallPath()).toBe("/api/tickets/ticket-1/satisfaction")
    expect(lastCallBody()).toEqual({ rating: 5, comment: "Ótimo!" })
  })

  it("rateTicket sem comment", async () => {
    mockApiFetch.mockResolvedValueOnce({ ticket: {} as never })
    await tickets.rateTicket("ticket-1", 3)

    expect(lastCallBody()).toEqual({ rating: 3, comment: undefined })
  })

  it("fetchTicketMessages → GET /api/tickets/{id}/messages", async () => {
    mockApiFetch.mockResolvedValueOnce({ messages: [] })
    await tickets.fetchTicketMessages("ticket-1")

    expect(lastCallPath()).toBe("/api/tickets/ticket-1/messages")
    expect(lastCallInit()).toBeUndefined()
  })

  it("sendTicketMessage → POST /api/tickets/{id}/messages com text e replyToId opcional", async () => {
    mockApiFetch.mockResolvedValueOnce({ message: {} as never })
    await tickets.sendTicketMessage("ticket-1", "Olá!", "msg-0", [{ id: "att-1", name: "doc.pdf", url: "https://...", size: 512, kind: "document" as const }])

    expect(lastCallPath()).toBe("/api/tickets/ticket-1/messages")
    expect(lastCallBody()).toEqual({
      text: "Olá!",
      replyToId: "msg-0",
      attachments: [{ id: "att-1", name: "doc.pdf", url: "https://...", size: 512, kind: "document" }],
    })
  })

  it("fetchCannedResponses → GET /api/tickets/canned-responses", async () => {
    mockApiFetch.mockResolvedValueOnce({ responses: [] })
    await tickets.fetchCannedResponses()

    expect(lastCallPath()).toBe("/api/tickets/canned-responses")
  })

  it("createCannedResponse → POST /api/tickets/canned-responses", async () => {
    mockApiFetch.mockResolvedValueOnce({ response: {} as never })
    await tickets.createCannedResponse({ title: "Senha", body: "Redefinir senha..." })

    expect(lastCallPath()).toBe("/api/tickets/canned-responses")
    expect(mockApiFetch).toHaveBeenCalledWith("/api/tickets/canned-responses", {
      method: "POST",
      body: JSON.stringify({ title: "Senha", body: "Redefinir senha..." }),
    })
  })

  it("updateCannedResponse → PATCH /api/tickets/canned-responses/{id}", async () => {
    mockApiFetch.mockResolvedValueOnce({ response: {} as never })
    await tickets.updateCannedResponse("cr-1", { body: "Novo texto" })

    expect(lastCallPath()).toBe("/api/tickets/canned-responses/cr-1")
    expect(mockApiFetch).toHaveBeenCalledWith("/api/tickets/canned-responses/cr-1", {
      method: "PATCH",
      body: JSON.stringify({ body: "Novo texto" }),
    })
  })

  it("deleteCannedResponse → DELETE /api/tickets/canned-responses/{id}", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    await tickets.deleteCannedResponse("cr-1")

    expect(lastCallPath()).toBe("/api/tickets/canned-responses/cr-1")
    expect(lastCallInit()?.method).toBe("DELETE")
  })

  it("fetchUnreadTickets → GET /api/tickets/unread", async () => {
    mockApiFetch.mockResolvedValueOnce({ counts: {} })
    await tickets.fetchUnreadTickets()

    expect(lastCallPath()).toBe("/api/tickets/unread")
  })

  it("fetchStaffBySector → GET /api/tickets/staff?sector=...", async () => {
    mockApiFetch.mockResolvedValueOnce({ staff: [] })
    await tickets.fetchStaffBySector("TI")

    expect(lastCallPath()).toBe("/api/tickets/staff?sector=TI")
  })

  it("fetchStaffBySector codifica caracteres especiais na query", async () => {
    mockApiFetch.mockResolvedValueOnce({ staff: [] })
    await tickets.fetchStaffBySector("SP-Suporte Técnico")

    expect(lastCallPath()).toBe("/api/tickets/staff?sector=SP-Suporte%20T%C3%A9cnico")
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Meetings
// ═══════════════════════════════════════════════════════════════════════════

describe("meetings", () => {
  it("fetchMeetings → GET /api/reunioes", async () => {
    mockApiFetch.mockResolvedValueOnce([])
    await meetings.fetchMeetings()

    expect(lastCallPath()).toBe("/api/reunioes")
    expect(lastCallInit()).toBeUndefined()
  })

  it("fetchMeeting → GET /api/reunioes/{id}", async () => {
    mockApiFetch.mockResolvedValueOnce({} as never)
    await meetings.fetchMeeting("meet-1")

    expect(lastCallPath()).toBe("/api/reunioes/meet-1")
  })

  it("createMeeting → POST /api/reunioes com body", async () => {
    const payload = { title: "Daily", scheduledFor: "2026-08-01T09:00:00Z", durationMinutes: 15 }
    mockApiFetch.mockResolvedValueOnce({} as never)
    await meetings.createMeeting(payload as never)

    expect(lastCallPath()).toBe("/api/reunioes")
    expect(mockApiFetch).toHaveBeenCalledWith("/api/reunioes", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  })

  it("joinMeeting → POST /api/reunioes/{id}/join", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    await meetings.joinMeeting("meet-1")

    expect(lastCallPath()).toBe("/api/reunioes/meet-1/join")
    expect(lastCallInit()?.method).toBe("POST")
  })

  it("leaveMeeting → POST /api/reunioes/{id}/leave com participantId", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    await meetings.leaveMeeting("meet-1", "participant-1")

    expect(lastCallPath()).toBe("/api/reunioes/meet-1/leave")
    expect(lastCallBody()).toEqual({ participantId: "participant-1" })
  })

  it("endMeeting → POST /api/reunioes/{id}/end", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    await meetings.endMeeting("meet-1")

    expect(lastCallPath()).toBe("/api/reunioes/meet-1/end")
    expect(lastCallInit()?.method).toBe("POST")
  })

  it("getLiveKitToken → POST /api/livekit/token com callId", async () => {
    mockApiFetch.mockResolvedValueOnce({ token: "tok", url: "https://livekit..." })
    await meetings.getLiveKitToken("call-1")

    expect(lastCallPath()).toBe("/api/livekit/token")
    expect(lastCallBody()).toEqual({ callId: "call-1" })
  })

  it("fetchInviteNotifications → GET /api/reunioes/invite-notifications", async () => {
    mockApiFetch.mockResolvedValueOnce({ notifications: [] })
    await meetings.fetchInviteNotifications()

    expect(lastCallPath()).toBe("/api/reunioes/invite-notifications")
  })

  it("respondToInvite → POST com { accepted }", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    await meetings.respondToInvite("notif-1", true)

    expect(lastCallPath()).toBe("/api/reunioes/invite-notifications/notif-1/respond")
    expect(lastCallBody()).toEqual({ accepted: true })
  })

  it("fetchRecordings → GET /api/reunioes/recordings", async () => {
    mockApiFetch.mockResolvedValueOnce({ recordings: [] })
    await meetings.fetchRecordings()

    expect(lastCallPath()).toBe("/api/reunioes/recordings")
  })

  it("downloadRecording → GET /api/reunioes/recordings/{id}/download", async () => {
    mockApiFetch.mockResolvedValueOnce({ url: "https://..." })
    await meetings.downloadRecording("rec-1")

    expect(lastCallPath()).toBe("/api/reunioes/recordings/rec-1/download")
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Kanban
// ═══════════════════════════════════════════════════════════════════════════

describe("kanban", () => {
  // ── Boards ─────────────────────────────────────────────────────
  describe("boards", () => {
    it("fetchBoards → GET /api/kanban/boards", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await kanban.fetchBoards()

      expect(lastCallPath()).toBe("/api/kanban/boards")
      expect(lastCallInit()).toBeUndefined()
    })

    it("createBoard → POST /api/kanban/boards", async () => {
      const payload = { title: "Meu Quadro", backgroundValue: "#2563eb" }
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.createBoard(payload)

      expect(lastCallPath()).toBe("/api/kanban/boards")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/kanban/boards", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    })

    it("updateBoard → PATCH /api/kanban/boards/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.updateBoard("board-1", { title: "Renomeado" })

      expect(lastCallPath()).toBe("/api/kanban/boards/board-1")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/kanban/boards/board-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Renomeado" }),
      })
    })

    it("deleteBoard → DELETE /api/kanban/boards/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteBoard("board-1")

      expect(lastCallPath()).toBe("/api/kanban/boards/board-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })

    it("duplicateBoard → POST /api/kanban/boards/{id}/duplicate", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.duplicateBoard("board-1")

      expect(lastCallPath()).toBe("/api/kanban/boards/board-1/duplicate")
      expect(lastCallInit()?.method).toBe("POST")
    })

    it("archiveBoard → POST /api/kanban/boards/{id}/archive", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.archiveBoard("board-1")

      expect(lastCallPath()).toBe("/api/kanban/boards/board-1/archive")
      expect(lastCallInit()?.method).toBe("POST")
    })
  })

  // ── Columns ────────────────────────────────────────────────────
  describe("columns", () => {
    it("fetchColumns → GET /api/kanban/boards/{boardId}/columns", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await kanban.fetchColumns("board-1")

      expect(lastCallPath()).toBe("/api/kanban/boards/board-1/columns")
    })

    it("createColumn → POST /api/kanban/boards/{boardId}/columns", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.createColumn("board-1", { title: "A Fazer", color: "#ef4444" })

      expect(lastCallPath()).toBe("/api/kanban/boards/board-1/columns")
      expect(lastCallBody()).toEqual({ title: "A Fazer", color: "#ef4444" })
    })

    it("updateColumn → PATCH /api/kanban/columns/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.updateColumn("col-1", { title: "Feito", isDoneColumn: true })

      expect(lastCallPath()).toBe("/api/kanban/columns/col-1")
      expect(lastCallBody()).toEqual({ title: "Feito", isDoneColumn: true })
    })

    it("deleteColumn → DELETE /api/kanban/columns/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteColumn("col-1")

      expect(lastCallPath()).toBe("/api/kanban/columns/col-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })

    it("duplicateColumn → POST /api/kanban/columns/{id}/duplicate", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.duplicateColumn("col-1")

      expect(lastCallPath()).toBe("/api/kanban/columns/col-1/duplicate")
    })

    it("archiveColumn → POST /api/kanban/columns/{id}/archive", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.archiveColumn("col-1")

      expect(lastCallPath()).toBe("/api/kanban/columns/col-1/archive")
    })

    it("moveColumn → POST /api/kanban/columns/{id}/move com position", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.moveColumn("col-1", 2)

      expect(lastCallPath()).toBe("/api/kanban/columns/col-1/move")
      expect(lastCallBody()).toEqual({ position: 2 })
    })
  })

  // ── Cards ──────────────────────────────────────────────────────
  describe("cards", () => {
    it("fetchCards → GET /api/kanban/boards/{boardId}/cards", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await kanban.fetchCards("board-1")

      expect(lastCallPath()).toBe("/api/kanban/boards/board-1/cards")
    })

    it("createCard → POST /api/kanban/columns/{columnId}/cards", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.createCard("col-1", { title: "Tarefa", priority: "alta" })

      expect(lastCallPath()).toBe("/api/kanban/columns/col-1/cards")
      expect(lastCallBody()).toEqual({ title: "Tarefa", priority: "alta" })
    })

    it("updateCard → PATCH /api/kanban/cards/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.updateCard("card-1", { title: "Editado" })

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/kanban/cards/card-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Editado" }),
      })
    })

    it("deleteCard → DELETE /api/kanban/cards/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteCard("card-1")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })

    it("moveCard → POST /api/kanban/cards/{id}/move com columnId e position", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.moveCard("card-1", { columnId: "col-2", position: 0 })

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/move")
      expect(lastCallBody()).toEqual({ columnId: "col-2", position: 0 })
    })

    it("duplicateCard → POST /api/kanban/cards/{id}/duplicate", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.duplicateCard("card-1")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/duplicate")
    })

    it("completeCard → POST /api/kanban/cards/{id}/complete", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.completeCard("card-1")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/complete")
    })

    it("archiveCard → POST /api/kanban/cards/{id}/archive", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.archiveCard("card-1")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/archive")
    })
  })

  // ── Labels ─────────────────────────────────────────────────────
  describe("labels", () => {
    it("fetchLabels → GET /api/kanban/labels", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await kanban.fetchLabels()

      expect(lastCallPath()).toBe("/api/kanban/labels")
    })

    it("createLabel → POST /api/kanban/labels", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.createLabel({ name: "Bug", color: "#ef4444" })

      expect(lastCallPath()).toBe("/api/kanban/labels")
      expect(lastCallBody()).toEqual({ name: "Bug", color: "#ef4444" })
    })

    it("updateLabel → PATCH /api/kanban/labels/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.updateLabel("label-1", { name: "Urgente" })

      expect(lastCallPath()).toBe("/api/kanban/labels/label-1")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/kanban/labels/label-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Urgente" }),
      })
    })

    it("deleteLabel → DELETE /api/kanban/labels/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteLabel("label-1")

      expect(lastCallPath()).toBe("/api/kanban/labels/label-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })
  })

  // ── Checklists ─────────────────────────────────────────────────
  describe("checklists", () => {
    it("fetchChecklists → GET /api/kanban/cards/{cardId}/checklists", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await kanban.fetchChecklists("card-1")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/checklists")
    })

    it("createChecklist → POST /api/kanban/cards/{cardId}/checklists", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.createChecklist("card-1", "Passos")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/checklists")
      expect(lastCallBody()).toEqual({ title: "Passos" })
    })

    it("updateChecklist → PATCH /api/kanban/checklists/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.updateChecklist("cl-1", "Novo nome")

      expect(lastCallPath()).toBe("/api/kanban/checklists/cl-1")
      expect(lastCallBody()).toEqual({ title: "Novo nome" })
    })

    it("deleteChecklist → DELETE /api/kanban/checklists/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteChecklist("cl-1")

      expect(lastCallPath()).toBe("/api/kanban/checklists/cl-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })

    it("fetchChecklistItems → GET /api/kanban/checklists/{checklistId}/items", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await kanban.fetchChecklistItems("cl-1")

      expect(lastCallPath()).toBe("/api/kanban/checklists/cl-1/items")
    })

    it("createChecklistItem → POST /api/kanban/checklists/{checklistId}/items", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.createChecklistItem("cl-1", "Item 1")

      expect(lastCallPath()).toBe("/api/kanban/checklists/cl-1/items")
      expect(lastCallBody()).toEqual({ title: "Item 1" })
    })

    it("updateChecklistItem → PATCH /api/kanban/checklist-items/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.updateChecklistItem("ci-1", { isCompleted: true })

      expect(lastCallPath()).toBe("/api/kanban/checklist-items/ci-1")
      expect(lastCallBody()).toEqual({ isCompleted: true })
    })

    it("deleteChecklistItem → DELETE /api/kanban/checklist-items/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteChecklistItem("ci-1")

      expect(lastCallPath()).toBe("/api/kanban/checklist-items/ci-1")
    })
  })

  // ── Comments ───────────────────────────────────────────────────
  describe("comments", () => {
    it("fetchComments → GET /api/kanban/cards/{cardId}/comments", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await kanban.fetchComments("card-1")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/comments")
    })

    it("addComment → POST /api/kanban/cards/{cardId}/comments", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.addComment("card-1", "Bom trabalho!")

      expect(lastCallPath()).toBe("/api/kanban/cards/card-1/comments")
      expect(lastCallBody()).toEqual({ content: "Bom trabalho!" })
    })

    it("updateComment → PATCH /api/kanban/comments/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await kanban.updateComment("cm-1", "Texto editado")

      expect(lastCallPath()).toBe("/api/kanban/comments/cm-1")
      expect(lastCallBody()).toEqual({ content: "Texto editado" })
    })

    it("deleteComment → DELETE /api/kanban/comments/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteComment("cm-1")

      expect(lastCallPath()).toBe("/api/kanban/comments/cm-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })
  })

  // ── Attachments ────────────────────────────────────────────────
  describe("attachments", () => {
    it("deleteAttachment → DELETE /api/kanban/attachments/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await kanban.deleteAttachment("att-1")

      expect(lastCallPath()).toBe("/api/kanban/attachments/att-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Chat Interno
// ═══════════════════════════════════════════════════════════════════════════

describe("chat", () => {
  // ── Conversations ──────────────────────────────────────────────
  describe("conversations", () => {
    it("fetchConversations → GET /api/chat-interno/conversations", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await chat.fetchConversations()

      expect(lastCallPath()).toBe("/api/chat-interno/conversations")
      expect(lastCallInit()).toBeUndefined()
    })

    it("createConversation → POST /api/chat-interno/conversations", async () => {
      const payload = { kind: "dm" as const, memberIds: ["user-1"] }
      mockApiFetch.mockResolvedValueOnce({} as never)
      await chat.createConversation(payload)

      expect(lastCallPath()).toBe("/api/chat-interno/conversations")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/chat-interno/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    })

    it("createConversation com name opcional", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await chat.createConversation({ kind: "group", memberIds: ["u1", "u2"], name: "Equipe" })

      expect(lastCallBody()).toEqual({ kind: "group", memberIds: ["u1", "u2"], name: "Equipe" })
    })

    it("fetchConversation → GET /api/chat-interno/conversations/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await chat.fetchConversation("conv-1")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1")
      expect(lastCallInit()).toBeUndefined()
    })

    it("leaveConversation → POST /api/chat-interno/conversations/{id}/leave", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.leaveConversation("conv-1")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/leave")
      expect(lastCallInit()?.method).toBe("POST")
    })

    it("addMember → POST /api/chat-interno/conversations/{id}/members com userId", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.addMember("conv-1", "user-2")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/members")
      expect(lastCallBody()).toEqual({ userId: "user-2" })
    })

    it("removeMember → POST .../members/{userId}/remove", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.removeMember("conv-1", "user-2")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/members/user-2/remove")
      expect(lastCallInit()?.method).toBe("POST")
    })

    it("toggleAdmin → POST .../members/{userId}/admin", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.toggleAdmin("conv-1", "user-2")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/members/user-2/admin")
      expect(lastCallInit()?.method).toBe("POST")
    })
  })

  // ── Messages ───────────────────────────────────────────────────
  describe("messages", () => {
    it("fetchMessages → GET /api/chat-interno/conversations/{id}/messages com query params", async () => {
      mockApiFetch.mockResolvedValueOnce({ messages: [] })
      await chat.fetchMessages("conv-1")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/messages?limit=50")
      expect(lastCallInit()).toBeUndefined()
    })

    it("fetchMessages com limit e before", async () => {
      mockApiFetch.mockResolvedValueOnce({ messages: [] })
      await chat.fetchMessages("conv-1", 20, "msg-100")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/messages?limit=20&before=msg-100")
    })

    it("sendMessage → POST .../messages com text e replyToId", async () => {
      mockApiFetch.mockResolvedValueOnce({ message: {} as never })
      await chat.sendMessage("conv-1", "Olá!", "msg-0")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/messages")
      expect(lastCallBody()).toEqual({ text: "Olá!", replyToId: "msg-0" })
    })

    it("sendMessage sem replyToId", async () => {
      mockApiFetch.mockResolvedValueOnce({ message: {} as never })
      await chat.sendMessage("conv-1", "Mensagem simples")

      expect(lastCallBody()).toEqual({ text: "Mensagem simples", replyToId: undefined })
    })

    it("editMessage → PATCH .../messages/{messageId}", async () => {
      mockApiFetch.mockResolvedValueOnce({ message: {} as never })
      await chat.editMessage("conv-1", "msg-1", "Texto editado")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/messages/msg-1")
      expect(lastCallBody()).toEqual({ text: "Texto editado" })
    })

    it("deleteMessage → POST .../messages/{messageId}/delete", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.deleteMessage("conv-1", "msg-1")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/messages/msg-1/delete")
      expect(lastCallInit()?.method).toBe("POST")
    })

    it("reactToMessage → POST .../messages/{messageId}/react com emoji", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.reactToMessage("conv-1", "msg-1", "👍")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/messages/msg-1/react")
      expect(lastCallBody()).toEqual({ emoji: "👍" })
    })
  })

  // ── Pins ───────────────────────────────────────────────────────
  describe("pins", () => {
    it("pinMessage → POST .../pins/{messageId}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.pinMessage("conv-1", "msg-1")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/pins/msg-1")
      expect(lastCallInit()?.method).toBe("POST")
    })

    it("unpinMessage → DELETE .../pins/{messageId}", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.unpinMessage("conv-1", "msg-1")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/pins/msg-1")
      expect(lastCallInit()?.method).toBe("DELETE")
    })
  })

  // ── Calls ──────────────────────────────────────────────────────
  describe("calls", () => {
    it("startCall → POST .../calls com kind", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await chat.startCall("conv-1", "video")

      expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/calls")
      expect(lastCallBody()).toEqual({ kind: "video" })
    })

    it("answerCall → POST /api/chat-interno/calls/{callId}/answer", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.answerCall("call-1")

      expect(lastCallPath()).toBe("/api/chat-interno/calls/call-1/answer")
    })

    it("declineCall → POST /api/chat-interno/calls/{callId}/decline", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.declineCall("call-1")

      expect(lastCallPath()).toBe("/api/chat-interno/calls/call-1/decline")
    })

    it("endCall → POST /api/chat-interno/calls/{callId}/end", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.endCall("call-1")

      expect(lastCallPath()).toBe("/api/chat-interno/calls/call-1/end")
    })

    it("missCall → POST /api/chat-interno/calls/{callId}/miss", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await chat.missCall("call-1")

      expect(lastCallPath()).toBe("/api/chat-interno/calls/call-1/miss")
    })
  })

  // ── Misc ───────────────────────────────────────────────────────
  it("fetchRoster → GET /api/chat-interno/roster", async () => {
    mockApiFetch.mockResolvedValueOnce({ members: [] })
    await chat.fetchRoster()

    expect(lastCallPath()).toBe("/api/chat-interno/roster")
  })

  it("fetchUnreadCount → GET /api/chat-interno/unread", async () => {
    mockApiFetch.mockResolvedValueOnce({ count: 5 })
    await chat.fetchUnreadCount()

    expect(lastCallPath()).toBe("/api/chat-interno/unread")
  })

  it("markConversationSeen → POST .../conversations/{id}/seen", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)
    await chat.markConversationSeen("conv-1")

    expect(lastCallPath()).toBe("/api/chat-interno/conversations/conv-1/seen")
    expect(lastCallInit()?.method).toBe("POST")
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Atividades Setor
// ═══════════════════════════════════════════════════════════════════════════

describe("activities", () => {
  // ── Events ─────────────────────────────────────────────────────
  describe("events", () => {
    it("fetchEvents → GET /api/atividades-setor/activities", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await activities.fetchEvents()

      expect(lastCallPath()).toBe("/api/atividades-setor/activities")
      expect(lastCallInit()).toBeUndefined()
    })

    it("fetchEvent → GET /api/atividades-setor/activities/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await activities.fetchEvent("evt-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/activities/evt-1")
      expect(lastCallInit()).toBeUndefined()
    })

    it("createEvent → POST /api/atividades-setor/activities", async () => {
      const payload = { title: "Reunião", date: "2026-08-15" }
      mockApiFetch.mockResolvedValueOnce({} as never)
      await activities.createEvent(payload as never)

      expect(lastCallPath()).toBe("/api/atividades-setor/activities")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/atividades-setor/activities", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    })

    it("updateEvent → PATCH /api/atividades-setor/activities/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await activities.updateEvent("evt-1", { title: "Reagendado" })

      expect(lastCallPath()).toBe("/api/atividades-setor/activities/evt-1")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/atividades-setor/activities/evt-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Reagendado" }),
      })
    })

    it("deleteEvent → POST /api/atividades-setor/activities/{id}/delete", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await activities.deleteEvent("evt-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/activities/evt-1/delete")
      expect(lastCallInit()?.method).toBe("POST")
    })
  })

  // ── Tasks ──────────────────────────────────────────────────────
  describe("tasks", () => {
    it("fetchTasks → GET /api/atividades-setor/tasks", async () => {
      mockApiFetch.mockResolvedValueOnce([])
      await activities.fetchTasks()

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks")
      expect(lastCallInit()).toBeUndefined()
    })

    it("fetchTask → GET /api/atividades-setor/tasks/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await activities.fetchTask("task-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1")
    })

    it("createTask → POST /api/atividades-setor/tasks", async () => {
      const payload = { title: "Nova tarefa", assigneeId: "user-1" }
      mockApiFetch.mockResolvedValueOnce({} as never)
      await activities.createTask(payload as never)

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks")
      expect(mockApiFetch).toHaveBeenCalledWith("/api/atividades-setor/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    })

    it("updateTask → PATCH /api/atividades-setor/tasks/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await activities.updateTask("task-1", { title: "Atualizado" })

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1")
      expect(lastCallBody()).toEqual({ title: "Atualizado" })
    })

    it("updateTaskStatus → POST /api/atividades-setor/tasks/{id}/status", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await activities.updateTaskStatus("task-1", "em_andamento")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/status")
      expect(lastCallBody()).toEqual({ status: "em_andamento" })
    })

    it("deleteTask → POST /api/atividades-setor/tasks/{id}/delete", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await activities.deleteTask("task-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/delete")
    })

    it("archiveTask → POST /api/atividades-setor/tasks/{id}/archive", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await activities.archiveTask("task-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/archive")
    })

    it("restoreTask → POST /api/atividades-setor/tasks/{id}/restore", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined)
      await activities.restoreTask("task-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/restore")
    })

    it("duplicateTask → POST /api/atividades-setor/tasks/{id}/duplicate", async () => {
      mockApiFetch.mockResolvedValueOnce({} as never)
      await activities.duplicateTask("task-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/duplicate")
    })

    it("fetchTaskComments → GET /api/atividades-setor/tasks/{id}/comments", async () => {
      mockApiFetch.mockResolvedValueOnce({ comments: [] })
      await activities.fetchTaskComments("task-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/comments")
    })

    it("addTaskComment → POST /api/atividades-setor/tasks/{id}/comments", async () => {
      mockApiFetch.mockResolvedValueOnce({ comment: {} })
      await activities.addTaskComment("task-1", "Comentário aqui")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/comments")
      expect(lastCallBody()).toEqual({ text: "Comentário aqui" })
    })

    it("fetchTaskHistory → GET /api/atividades-setor/tasks/{id}/history", async () => {
      mockApiFetch.mockResolvedValueOnce({ history: [] })
      await activities.fetchTaskHistory("task-1")

      expect(lastCallPath()).toBe("/api/atividades-setor/tasks/task-1/history")
    })
  })
})
