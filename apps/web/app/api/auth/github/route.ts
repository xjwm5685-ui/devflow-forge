import { loginAsDemo } from "@/lib/auth/mock-auth"
import { setSessionCookie, shouldUseSecureCookies } from "@/lib/auth/session"
import { getRedirectGitHubClientId } from "@/lib/github/oauth-config"
import { getGitHubOAuthScope } from "@/lib/github/oauth-login"
import { NextResponse } from "next/server"

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

  // Production: real GitHub OAuth
  const clientId = getRedirectGitHubClientId()
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID not configured for redirect OAuth. Use Device Flow from the login page or set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." },
      { status: 500 }
    )
  }

  const state = crypto.randomUUID()

  const callbackUrl = `${getBaseUrl(request)}/api/auth/github/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: getGitHubOAuthScope(),
    state,
  })

  const response = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`
  )
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return response
}
