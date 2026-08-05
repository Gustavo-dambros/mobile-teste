import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SupabaseClient } from "@supabase/supabase-js"

// ---------------------------------------------------------------------------
// Mocks — hoisted by vitest before any import
// ---------------------------------------------------------------------------

const mockGetSession = vi.fn()
const mockRefreshSession = vi.fn()
const mockGetConfig = vi.fn()

vi.mock("../supabase", () => ({
  getConfig: mockGetConfig,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSupabase(sessionToken: string | null) {
  return {
    auth: {
      getSession: mockGetSession.mockResolvedValue({
        data: { session: sessionToken ? { access_token: sessionToken } : null },
        error: null,
      }),
      refreshSession: mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient
}

function mockFetchResponse(status: number, body: unknown, options?: { statusText?: string }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: options?.statusText ?? "",
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function mockFetch204() {
  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    headers: new Headers(),
    json: () => Promise.reject(new Error("no body")),
  } as unknown as Response
}

// Extrai as opções da chamada feita ao fetch para inspeção nos asserts.
function getRequestOptions(fetchSpy: { mock: { calls: unknown[][] } }) {
  const [, options] = fetchSpy.mock.calls[0] ?? []
  return options as RequestInit
}

// ---------------------------------------------------------------------------
// Subject under test (lazy import after vi.mock is in place)
// ---------------------------------------------------------------------------

const { apiFetch } = await import("../api-fetch")
const { ApiAuthError, ApiForbiddenError, ApiNotFoundError, ApiConflictError, ApiRateLimitError, ApiServerError, ApiError } = await import("../errors")

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  // Default: baseURL vazia, sem sessão
  mockGetConfig.mockReturnValue({
    baseURL: "",
    supabase: mockSupabase(null),
  })
})

describe("apiFetch — sucesso", () => {
  it("faz uma requisição GET e retorna o JSON", async () => {
    const body = { id: "abc", title: "Teste" }
    const mockRes = mockFetchResponse(200, body)
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    const data = await apiFetch("/api/test")
    expect(data).toEqual(body)
    expect(fetchSpy).toHaveBeenCalledWith("/api/test", expect.any(Object))
  })

  it("faz uma requisição POST com body", async () => {
    const payload = { title: "Novo" }
    const body = { id: "1", ...payload }
    const mockRes = mockFetchResponse(201, body)
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    const data = await apiFetch("/api/test", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    expect(data).toEqual(body)
    expect(fetchSpy).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
    }))
  })

  it("faz uma requisição PATCH com body parcial", async () => {
    const body = { id: "1", title: "Editado" }
    const mockRes = mockFetchResponse(200, body)
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    const data = await apiFetch("/api/test/1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Editado" }),
    })

    expect(data).toEqual(body)
  })

  it("retorna undefined para 204 No Content (DELETE)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockFetch204())

    const result = await apiFetch("/api/test/1", { method: "DELETE" })

    expect(result).toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe("apiFetch — baseURL", () => {
  it("concatena baseURL com o path", async () => {
    mockGetConfig.mockReturnValue({
      baseURL: "http://localhost:3000",
      supabase: mockSupabase(null),
    })

    const mockRes = mockFetchResponse(200, [])
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    await apiFetch("/api/tickets")

    expect(fetchSpy).toHaveBeenCalledWith("http://localhost:3000/api/tickets", expect.anything())
  })

  it("funciona com baseURL vazia (mesmo origin)", async () => {
    mockGetConfig.mockReturnValue({
      baseURL: "",
      supabase: mockSupabase(null),
    })

    const mockRes = mockFetchResponse(200, {})
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    await apiFetch("/api/tickets")

    expect(fetchSpy).toHaveBeenCalledWith("/api/tickets", expect.anything())
  })
})

describe("apiFetch — Bearer token injection", () => {
  it("injeta Authorization: Bearer <token> quando há sessão", async () => {
    mockGetConfig.mockReturnValue({
      baseURL: "",
      supabase: mockSupabase("jwt-token-valido"),
    })

    const mockRes = mockFetchResponse(200, [])
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    await apiFetch("/api/test")

    const calledHeaders = getRequestOptions(fetchSpy).headers as Headers
    expect(calledHeaders.get("Authorization")).toBe("Bearer jwt-token-valido")
  })

  it("NÃO injeta Authorization quando não há sessão", async () => {
    mockGetConfig.mockReturnValue({
      baseURL: "",
      supabase: mockSupabase(null),
    })

    const mockRes = mockFetchResponse(200, [])
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    await apiFetch("/api/test")

    const calledHeaders = getRequestOptions(fetchSpy).headers as Headers
    expect(calledHeaders.has("Authorization")).toBe(false)
  })

  it("segue sem token se getSession() lançar exceção", async () => {
    const failingSupabase = {
      auth: {
        getSession: vi.fn().mockRejectedValue(new Error("Rede falhou")),
      },
    }
    mockGetConfig.mockReturnValue({
      baseURL: "",
      supabase: failingSupabase as unknown as SupabaseClient,
    })

    const mockRes = mockFetchResponse(200, [])
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    const data = await apiFetch("/api/test")

    expect(data).toEqual([])
    const calledHeaders = getRequestOptions(fetchSpy).headers as Headers
    expect(calledHeaders.has("Authorization")).toBe(false)
  })
})

describe("apiFetch — Content-Type header", () => {
  it("define Content-Type: application/json por padrão", async () => {
    const mockRes = mockFetchResponse(200, {})
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    await apiFetch("/api/test")

    const calledHeaders = getRequestOptions(fetchSpy).headers as Headers
    expect(calledHeaders.get("Content-Type")).toBe("application/json")
  })

  it("preserva Content-Type customizado fornecido pelo caller", async () => {
    const mockRes = mockFetchResponse(200, {})
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    await apiFetch("/api/test", {
      headers: { "Content-Type": "text/plain" },
    })

    const calledHeaders = getRequestOptions(fetchSpy).headers as Headers
    // O Content-Type fornecido pelo caller não deve ser sobrescrito
    expect(calledHeaders.get("Content-Type")).toBe("text/plain")
  })

  it("merge headers customizados com os padrão", async () => {
    const mockRes = mockFetchResponse(200, {})
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    await apiFetch("/api/test", {
      headers: { "X-Correlation-Id": "abc-123" },
    })

    const calledHeaders = getRequestOptions(fetchSpy).headers as Headers
    expect(calledHeaders.get("Content-Type")).toBe("application/json")
    expect(calledHeaders.get("X-Correlation-Id")).toBe("abc-123")
  })
})

describe("apiFetch — error handling", () => {
  it.each([
    { status: 403, expectedError: ApiForbiddenError, expectedName: "ApiForbiddenError", expectedMessage: "Sem permissão" },
    { status: 404, expectedError: ApiNotFoundError, expectedName: "ApiNotFoundError", expectedMessage: "Recurso não encontrado" },
    { status: 409, expectedError: ApiConflictError, expectedName: "ApiConflictError", expectedMessage: "Conflito" },
    { status: 429, expectedError: ApiRateLimitError, expectedName: "ApiRateLimitError", expectedMessage: "Muitas requisições" },
    { status: 500, expectedError: ApiServerError, expectedName: "ApiServerError", expectedMessage: "Erro interno" },
    { status: 502, expectedError: ApiServerError, expectedName: "ApiServerError", expectedMessage: "Bad Gateway", expectedStatus: 500 },
    { status: 400, expectedError: ApiError, expectedName: "ApiError", expectedMessage: "Requisição inválida" },
  ])("lança $expectedName para status $status", async ({ status, expectedError, expectedMessage, expectedStatus }) => {
    const mockRes = mockFetchResponse(status, { error: expectedMessage })
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    try {
      await apiFetch("/api/test")
      expect.unreachable("Deveria ter lançado exceção")
    } catch (error) {
      expect(error).toBeInstanceOf(expectedError)
      expect((error as { message: string }).message).toBe(expectedMessage)
      expect((error as { status?: number }).status).toBe(expectedStatus ?? status)
    }
  })

  it("usa mensagem genérica quando o servidor não retorna body de erro", async () => {
    const mockRes = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers(),
      json: () => Promise.reject(new Error("parse error")),
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes as unknown as Response)

    try {
      await apiFetch("/api/test")
      expect.unreachable("Deveria ter lançado exceção")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiServerError)
      expect((error as { message: string }).message).toBe("Erro 500")
    }
  })
})

describe("apiFetch — refresh automático em 401", () => {
  it("tenta renovar a sessão UMA vez e refaz a requisição em caso de sucesso", async () => {
    mockGetConfig.mockReturnValue({
      baseURL: "",
      supabase: mockSupabase("token-expirado"),
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: "token-renovado" } },
      error: null,
    })

    const authRes = mockFetchResponse(401, { error: "Token inválido" })
    const okRes = mockFetchResponse(200, { ok: true })
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(authRes)
      .mockResolvedValueOnce(okRes)

    const data = await apiFetch("/api/test")

    expect(data).toEqual({ ok: true })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(mockRefreshSession).toHaveBeenCalledTimes(1)
  })

  it("lança ApiAuthError quando o refresh falha (sessão expirada de verdade)", async () => {
    mockGetConfig.mockReturnValue({
      baseURL: "",
      supabase: mockSupabase("token-expirado"),
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh_token expirado" },
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockFetchResponse(401, { error: "Token inválido" }))

    await expect(apiFetch("/api/test")).rejects.toBeInstanceOf(ApiAuthError)
    expect(mockRefreshSession).toHaveBeenCalledTimes(1)
  })

  it("NÃO faz retry no segundo 401 (após refresh)", async () => {
    mockGetConfig.mockReturnValue({
      baseURL: "",
      supabase: mockSupabase("token-expirado"),
    })
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: "token-renovado" } },
      error: null,
    })

    const authRes = mockFetchResponse(401, { error: "Token inválido" })
    const authRes2 = mockFetchResponse(401, { error: "Token inválido" })
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(authRes)
      .mockResolvedValueOnce(authRes2)

    await expect(apiFetch("/api/test")).rejects.toBeInstanceOf(ApiAuthError)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(mockRefreshSession).toHaveBeenCalledTimes(1)
  })
})

describe("apiFetch — edge cases", () => {
  it("lança erro se getConfig() não foi inicializado", async () => {
    // Simula config não inicializado removendo o mock para que o módulo real
    // seja usado — mas como estamos mockando, testamos que a função propaga
    // o erro do getConfig().
    mockGetConfig.mockImplementation(() => {
      throw new Error("API config not initialized. Call getSupabaseClient() first.")
    })

    await expect(apiFetch("/api/test")).rejects.toThrow("API config not initialized")
  })

  it("suporta array de headers (formato string[][])", async () => {
    const mockRes = mockFetchResponse(200, {})
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes)

    // O formato string[][] é aceito pelo Headers() constructor
    await apiFetch("/api/test", {
      headers: [["X-Custom", "valor"]] as unknown as HeadersInit,
    })

    const calledHeaders = getRequestOptions(fetchSpy).headers as Headers
    expect(calledHeaders.get("X-Custom")).toBe("valor")
    expect(calledHeaders.get("Content-Type")).toBe("application/json")
  })
})
