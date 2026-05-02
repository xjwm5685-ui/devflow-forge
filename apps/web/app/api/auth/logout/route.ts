import { shouldUseSecureCookies } from "@/lib/auth/session"
import { NextResponse } from "next/server"

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: shouldUseSecureCookies(),
  sameSite: "lax" as const,
  maxAge: 0,
  path: "/",
}

function clearAuthCookies(response: NextResponse): void {
  response.cookies.set("session", "", { ...CLEAR_COOKIE_OPTIONS, expires: new Date(0) })
  response.cookies.set("oauth_state", "", { ...CLEAR_COOKIE_OPTIONS, expires: new Date(0) })
}

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearAuthCookies(response)
  return response
}
