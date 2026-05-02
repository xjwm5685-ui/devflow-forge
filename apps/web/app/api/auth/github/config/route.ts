import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { getDeviceGitHubClientId, hasGitHubClientId } from "@/lib/github/oauth-config"

export async function GET() {
  const demoMode = process.env.DEMO_MODE === "true"
  const hasEnvClientId = hasGitHubClientId()
  const hasClientId = !!getDeviceGitHubClientId()
  const hasClientSecret = !!process.env.GITHUB_CLIENT_SECRET
  const requestedMode = process.env.GITHUB_OAUTH_MODE?.trim().toLowerCase()
  const mode = demoMode
    ? "demo"
    : requestedMode === "device" || (hasClientId && !hasClientSecret)
      ? "device"
      : "redirect"

  const session = await getSession()
  const authenticated = !!session

  return NextResponse.json({
    mode,
    hasClientId,
    hasEnvClientId,
    ...(authenticated ? { hasClientSecret } : {}),
  })
}
