import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { getSessionSecret } from "./secret"

export interface SessionUser {
  id: string
  githubId: number
  login: string
  email: string | null
  avatarUrl: string | null
}

export async function createSession(user: SessionUser): Promise<string> {
  const secret = getSessionSecret()
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  try {
    const secret = getSessionSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload.user as SessionUser
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
