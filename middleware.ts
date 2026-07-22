import { NextResponse, type NextRequest } from "next/server"

// TEMPORARIO: Auth desabilitada para teste - REVERTER DEPOIS
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
}
