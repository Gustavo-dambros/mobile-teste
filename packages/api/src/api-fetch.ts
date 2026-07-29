import { getConfig } from "./supabase"
import { createApiErrorFromStatus } from "./errors"

export type { ApiError, ApiAuthError, ApiForbiddenError, ApiNotFoundError, ApiConflictError, ApiRateLimitError, ApiServerError } from "./errors"

/**
 * Fetch utility padronizado para todas as chamadas de API do @unipar/api.
 *
 * Comportamento:
 * 1. Lê a `baseURL` configurada via `getSupabaseClient()` (injetável por
 *    plataforma — Web usa variáveis `NEXT_PUBLIC_*`, Mobile usa `EXPO_PUBLIC_*`).
 * 2. Extrai automaticamente o token JWT da sessão ativa do Supabase e o
 *    injeta no header `Authorization: Bearer <token>`.
 * 3. Trata respostas de erro HTTP (4xx/5xx) com exceções tipadas.
 *
 * @example
 * ```ts
 * // Web: NEXT_PUBLIC_API_URL=http://localhost:3000
 * // Mobile: EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
 *
 * const data = await apiFetch<MyType>("/tickets")
 * const created = await apiFetch<MyType>("/tickets", {
 *   method: "POST",
 *   body: JSON.stringify(payload),
 * })
 * ```
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { baseURL, supabase } = getConfig()

  // Extrai o token JWT da sessão atual para injetar no header
  let token: string | undefined
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    token = session?.access_token
  } catch {
    // Se não conseguir obter a sessão (ex: ainda não inicializada),
    // a requisição segue sem token — o servidor retornará 401.
  }

  const mergedOptions: RequestInit = { ...options }
  const headers = new Headers(options?.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (token) headers.set("Authorization", `Bearer ${token}`)
  mergedOptions.headers = headers

  const res = await fetch(`${baseURL}${path}`, mergedOptions)

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw createApiErrorFromStatus(body.error ?? `Erro ${res.status}`, res.status)
  }

  // Se a resposta for 204 No Content (delete, etc.)
  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}
