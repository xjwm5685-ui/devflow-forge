import { loginAsDemo } from "@/lib/auth/mock-auth"
import { setSessionCookie } from "@/lib/auth/session"
import { getDeviceGitHubClientId } from "@/lib/github/oauth-config"
import { getGitHubOAuthScope } from "@/lib/github/oauth-login"
import { NextResponse } from "next/server"

async function readGitHubOAuthError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null) as {
      error?: string
      error_description?: string
      error_uri?: string
    } | null
    const detail = data?.error_description ?? data?.error
    if (detail) return detail
  }

  const text = await response.text().catch(() => "")
  const trimmed = text.trim()
  return trimmed || `GitHub returned HTTP ${response.status}`
}

function normalizeDeviceFlowError(message: string): string {
  if (/device.*flow.*disabled|device_flow_disabled/i.test(message)) {
    return "GitHub Device Flow is disabled for this OAuth App. Open GitHub Developer Settings, edit the OAuth App, enable Device Flow, then try again."
  }
  if (/incorrect client credentials|bad credentials|invalid_client|client/i.test(message)) {
    return "GitHub rejected the OAuth Client ID. Check that the bundled or configured GITHUB_CLIENT_ID still belongs to an existing OAuth App."
  }
  return message
}

export async function POST() {
  if (process.env.DEMO_MODE === "true") {
    const { token } = await loginAsDemo()
    return setSessionCookie(
      NextResponse.json({ demo: true, redirectTo: "/dashboard" }),
      token,
    )
  }

  const clientId = getDeviceGitHubClientId()
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID not configured" }, { status: 500 })
  }

  let response: Response
  try {
    response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        scope: getGitHubOAuthScope(),
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed"
    return NextResponse.json(
      { error: `Cannot reach GitHub to start Device Flow: ${message}` },
      { status: 502 }
    )
  }

  if (!response.ok) {
    const message = normalizeDeviceFlowError(await readGitHubOAuthError(response))
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const data = (await response.json()) as {
    device_code?: string
    user_code?: string
    verification_uri?: string
    verification_uri_complete?: string
    expires_in?: number
    interval?: number
    error?: string
    error_description?: string
  }

  if (data.error || !data.device_code || !data.user_code || !data.verification_uri) {
    return NextResponse.json(
      { error: normalizeDeviceFlowError(data.error_description ?? data.error ?? "GitHub did not return a device code") },
      { status: 502 }
    )
  }

  return NextResponse.json({
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    verificationUriComplete: data.verification_uri_complete,
    expiresIn: data.expires_in ?? 900,
    interval: data.interval ?? 5,
  })
}
