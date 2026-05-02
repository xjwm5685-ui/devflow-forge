import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { getSessionSecret } from "@/lib/auth/secret"
import { rateLimit, authRateLimit } from "@/lib/rate-limit"

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, getSessionSecret())
    return true
  } catch {
    return false
  }
}

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.github.com https://*.openai.com https://api.openai.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", CSP_HEADER)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  return response
}

export async function middleware(request: NextRequest) {
  const isAuthEndpoint = request.nextUrl.pathname.startsWith("/api/auth/github")
  if (isAuthEndpoint) {
    const limitResponse = authRateLimit(request)
    if (limitResponse) return limitResponse
  } else if (request.nextUrl.pathname.startsWith("/api/")) {
    const limitResponse = rateLimit(request)
    if (limitResponse) return limitResponse
  }

  const token = request.cookies.get("session")?.value
  const valid = await hasValidSession(token)

  const isLoginPage = request.nextUrl.pathname === "/login"
  const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth")
  const isHealthRoute = request.nextUrl.pathname === "/api/health"
  const isWebhookRoute = request.nextUrl.pathname.startsWith("/api/webhooks")
  const isPublicRoute = isLoginPage || isAuthRoute || isHealthRoute || isWebhookRoute

  if (isPublicRoute) {
    if (isLoginPage && valid) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)))
    }
    return addSecurityHeaders(NextResponse.next())
  }

  if (!valid) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)))
  }

  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
}
