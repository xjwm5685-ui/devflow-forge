import { loginAsDemo } from "@/lib/auth/mock-auth"
import { setSessionCookie, shouldUseSecureCookies } from "@/lib/auth/session"
import { getRedirectGitHubClientId } from "@/lib/github/oauth-config"
import { completeGitHubLogin } from "@/lib/github/oauth-login"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

function getBaseUrl(request: Request): string {
  const configuredUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, "")

  return new URL(request.url).origin
}

export async function GET(request: Request) {
  const isDemo = process.env.DEMO_MODE === "true"

  if (isDemo) {
    const { token } = await loginAsDemo()
    return setSessionCookie(
      NextResponse.redirect(new URL("/dashboard", request.url)),
      token,
    )
  }

  // Production: real GitHub OAuth callback
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_denied", request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=oauth_invalid", request.url))
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value

  if (!savedState || savedState !== state) {
    const res = NextResponse.redirect(new URL("/login?error=oauth_state", request.url))
    res.cookies.set("oauth_state", "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })
    return res
  }

  // Exchange code for access token
  const clientId = getRedirectGitHubClientId()
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=oauth_config", request.url))
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
      redirect_uri: `${getBaseUrl(request)}/api/auth/github/callback`,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_token", request.url))
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(new URL("/login?error=oauth_access", request.url))
  }

  try {
    const sessionToken = await completeGitHubLogin(tokenData.access_token)
    const res = NextResponse.redirect(new URL("/dashboard", request.url))
    res.cookies.set("oauth_state", "", {
      httpOnly: true,
      secure: shouldUseSecureCookies(),
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })
    return setSessionCookie(res, sessionToken)
  } catch (err) {
    console.error("[OAuth] GitHub login failed:", err instanceof Error ? err.message : err)
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url))
  }
}
