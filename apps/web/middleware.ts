import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required in production")
    }
    return new TextEncoder().encode(crypto.randomUUID())
  }
  return new TextEncoder().encode(secret)
}

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value
  const valid = await hasValidSession(token)

  const isLoginPage = request.nextUrl.pathname === "/login"
  const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth")
  const isHealthRoute = request.nextUrl.pathname === "/api/health"
  const isPublicRoute = isLoginPage || isAuthRoute || isHealthRoute

  if (isPublicRoute) {
    if (isLoginPage && valid) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!valid) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
}
