import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

/** Rotas de API públicas que não exigem autenticação. */
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/access-request/",
  "/api/recuperar-conta/",
]

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isApiRoute = pathname.startsWith("/api/")

  // Rotas de API públicas (login, recuperar conta, etc.) — permitir sem sessão
  if (isApiRoute && isPublicApiRoute(pathname)) {
    return NextResponse.next()
  }

  const { response, user } = await updateSession(request)

  if (!user) {
    if (isApiRoute) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Páginas Web — redirecionar para login preservando a URL de destino
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|sw.js|manifest.webmanifest).*)",
  ],
}
