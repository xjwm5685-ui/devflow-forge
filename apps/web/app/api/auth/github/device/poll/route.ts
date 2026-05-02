import { getDeviceGitHubClientId } from "@/lib/github/oauth-config"
import { completeGitHubLogin } from "@/lib/github/oauth-login"
import { setSessionCookie } from "@/lib/auth/session"
import { NextResponse } from "next/server"

async function readGitHubOAuthError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null) as {
      error?: string
      error_description?: string
    } | null
    const detail = data?.error_description ?? data?.error
    if (detail) return detail
  }

  const text = await response.text().catch(() => "")
  return text.trim() || `GitHub returned HTTP ${response.status}`
}

export async function POST(request: Request) {
  const clientId = getDeviceGitHubClientId()
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID not configured" }, { status: 500 })
  }

  const body = await request.json().catch(() => null) as { deviceCode?: unknown } | null
  const deviceCode = typeof body?.deviceCode === "string" ? body.deviceCode : ""
  if (!deviceCode) {
    return NextResponse.json({ error: "Missing deviceCode" }, { status: 400 })
  }

  let response: Response
  try {
    response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed"
    return NextResponse.json(
      { error: `Cannot reach GitHub to finish Device Flow: ${message}` },
      { status: 502 }
    )
  }

  if (!response.ok) {
    return NextResponse.json({ error: await readGitHubOAuthError(response) }, { status: 502 })
  }

  const data = (await response.json()) as {
    access_token?: string
    error?: string
    error_description?: string
    interval?: number
  }

  if (data.error === "authorization_pending" || data.error === "slow_down") {
    return NextResponse.json(
      {
        pending: true,
        error: data.error,
        interval: data.error === "slow_down" ? data.interval ?? 10 : undefined,
      },
      { status: 202 }
    )
  }

  if (data.error || !data.access_token) {
    const status = data.error === "expired_token" ? 410 : 401
    return NextResponse.json(
      { error: data.error_description ?? data.error ?? "No access token received" },
      { status }
    )
  }

  try {
    const sessionToken = await completeGitHubLogin(data.access_token)
    return setSessionCookie(
      NextResponse.json({ ok: true, redirectTo: "/dashboard" }),
      sessionToken,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign in with GitHub"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
