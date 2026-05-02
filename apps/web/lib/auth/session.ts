import { SignJWT, jwtVerify } from "jose"
import { z } from "zod"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getSessionSecret } from "./secret"

export const SessionUserSchema = z.object({
  id: z.string(),
  githubId: z.number(),
  login: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})

export type SessionUser = z.infer<typeof SessionUserSchema>

function isLocalHttpUrl(value: string | undefined): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" && (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    )
  } catch {
    return false
  }
}

export function shouldUseSecureCookies(): boolean {
  if (process.env.NODE_ENV !== "production") return false

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL
  return !isLocalHttpUrl(appUrl)
}

export async function createSession(user: SessionUser): Promise<string> {
  const secret = getSessionSecret()
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  try {
    const secret = getSessionSecret()
    const { payload } = await jwtVerify(token, secret)
    const parsed = SessionUserSchema.safeParse(payload.user)
    if (!parsed.success) {
      console.error("[Session] JWT payload validation failed:", parsed.error.message)
      return null
    }
    return parsed.data
  } catch (err) {
    console.error("[Session] JWT verification failed:", err instanceof Error ? err.message : err)
    return null
  }
}

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: shouldUseSecureCookies(),
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
}

export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set("session", token, SESSION_COOKIE_OPTIONS)
  return response
}
