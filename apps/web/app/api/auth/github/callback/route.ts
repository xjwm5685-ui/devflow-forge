import { loginAsDemo } from "@/lib/auth/mock-auth"
import { prisma } from "@/lib/db"
import { createSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const isDemo = process.env.DEMO_MODE === "true"

  if (isDemo) {
    await loginAsDemo()
    redirect("/dashboard")
  }

  // Production: real GitHub OAuth callback
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.json({ error: `GitHub OAuth error: ${error}` }, { status: 400 })
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state parameter" }, { status: 400 })
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value
  cookieStore.delete("oauth_state")

  if (!savedState || savedState !== state) {
    return NextResponse.json({ error: "Invalid OAuth state (CSRF check failed)" }, { status: 403 })
  }

  // Exchange code for access token
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "GitHub OAuth credentials not configured" }, { status: 500 })
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Failed to exchange code for token" }, { status: 502 })
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.json(
      { error: tokenData.error_description ?? "No access token received" },
      { status: 401 }
    )
  }

  const accessToken = tokenData.access_token

  // Fetch user profile from GitHub
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!userRes.ok) {
    return NextResponse.json({ error: "Failed to fetch GitHub user profile" }, { status: 502 })
  }

  const ghUser = (await userRes.json()) as {
    id: number
    login: string
    email: string | null
    avatar_url: string | null
  }

  // Upsert user in database
  const user = await prisma.user.upsert({
    where: { githubId: ghUser.id },
    update: {
      login: ghUser.login,
      email: ghUser.email,
      avatarUrl: ghUser.avatar_url,
      accessToken,
    },
    create: {
      githubId: ghUser.id,
      login: ghUser.login,
      email: ghUser.email,
      avatarUrl: ghUser.avatar_url,
      accessToken,
    },
  })

  // Create JWT session
  await createSession({
    id: user.id,
    githubId: user.githubId,
    login: user.login,
    email: user.email,
    avatarUrl: user.avatarUrl,
  })

  redirect("/dashboard")
}
