import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = ["/login", "/recuperar-conta", "/solicitacao-acesso", "/reunioes/entrar"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  const { response, supabase, user } = await updateSession(request)

  let isAuthenticated = false
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, deleted_at")
      .eq("id", user.id)
      .single()
    isAuthenticated = !!profile && profile.status === "ACTIVE" && profile.deleted_at === null
  }

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
}
