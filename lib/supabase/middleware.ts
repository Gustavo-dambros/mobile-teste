import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Atualiza a sessão do usuário para a requisição atual.
 *
 * Estratégia Dual-Auth:
 * 1. Se o header `Authorization: Bearer <token>` estiver presente, valida o JWT
 *    diretamente (sem cookies) — usado pelo App Mobile (Expo).
 * 2. Caso contrário, usa o fluxo padrão baseado em Cookies via @supabase/ssr.
 *
 * Retorna `{ response, supabase, user }` onde `user` é o usuário autenticado
 * ou `null` se não houver sessão válida.
 */
export async function updateSession(request: NextRequest) {
  // ---- Tentativa 1: Bearer token ----
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const {
        data: { user },
      } = await supabase.auth.getUser(token)

      if (user) {
        // Token válido — cria uma response sem sessão em cookie
        return { response: NextResponse.next(), supabase, user }
      }
    } catch {
      // Token inválido — cai no retorno com user null abaixo
    }

    // Bearer token presente mas inválido: não faz fallback para cookies
    return { response: NextResponse.next(), supabase: null, user: null }
  }

  // ---- Tentativa 2: Cookie-based (Web) ----
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, supabase, user }
}
