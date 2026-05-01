import { loginAsDemo } from "@/lib/auth/mock-auth"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const isDemo = process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production"

  if (isDemo) {
    await loginAsDemo()
    redirect("/dashboard")
  }

  // Production: real GitHub OAuth
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID not configured" },
      { status: 500 }
    )
  }

  // Generate CSRF state and store in cookie
  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  })

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo read:org",
    state,
  })

  redirect(`https://github.com/login/oauth/authorize?${params}`)
}
