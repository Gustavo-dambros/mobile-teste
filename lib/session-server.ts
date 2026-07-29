import "server-only"

import { createClient } from "@supabase/supabase-js"

import { createClient as createCookieClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SessionRole, SessionUser } from "@unipar/types"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function buildSessionUser(authUserId: string): Promise<SessionUser | null> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, name, email, role, status, deleted_at, phone, sector, cpf, presence_status, work_activity_status, status_message, is_sector_leader"
    )
    .eq("id", authUserId)
    .single()

  if (!profile || profile.status !== "ACTIVE" || profile.deleted_at !== null) return null

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as SessionRole,
    phone: profile.phone ?? "",
    sector: profile.sector,
    cpf: profile.cpf,
    presenceStatus: profile.presence_status,
    workActivityStatus: profile.work_activity_status,
    statusMessage: profile.status_message,
    isSectorLeader: profile.is_sector_leader,
  }
}

// ---------------------------------------------------------------------------
// Cookie-based session (Server Components, SSR)
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createCookieClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return null

    return await buildSessionUser(authUser.id)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Dual-auth: Bearer token OR cookie fallback (API Route Handlers)
// ---------------------------------------------------------------------------

/**
 * Obtém o usuário atual a partir de uma requisição HTTP.
 *
 * 1. Se o header `Authorization: Bearer <token>` estiver presente, valida o JWT
 *    diretamente via Supabase (`supabase.auth.getUser(token)`) — sem depender
 *    de cookies. Necessário para requisições do App Mobile (Expo).
 * 2. Caso contrário, faz fallback para o método baseado em Cookies da Web.
 *
 * Retorna `null` se não houver sessão válida (independentemente da origem).
 */
export async function getCurrentUserFromRequest(request: Request): Promise<SessionUser | null> {
  // --- Tentativa 1: Bearer token ---
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    try {
      // Cria um client Supabase anônimo (sem cookies) apenas para validar o JWT
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(token)

      if (authUser && !error) {
        return await buildSessionUser(authUser.id)
      }
    } catch {
      // Token inválido ou expirado — cai no retorno null abaixo
    }

    // Se o client explicitamente enviou um Bearer token, não faz fallback para
    // cookies — a resposta deve ser 401, não um redirecionamento de página.
    return null
  }

  // --- Tentativa 2: Cookie-based (fallback Web) ---
  return getCurrentUser()
}
