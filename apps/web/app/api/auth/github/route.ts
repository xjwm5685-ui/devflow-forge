import { loginAsDemo } from "@/lib/auth/mock-auth"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"

export async function GET() {
  const isDemo = process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production"

  if (!isDemo) {
    // In production, redirect to real GitHub OAuth
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: "GITHUB_CLIENT_ID not configured. Set DEMO_MODE=true for demo login." },
        { status: 500 }
      )
    }
    const state = Math.random().toString(36).slice(2)
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo+read:org&state=${state}`
    redirect(githubUrl)
  }

  // Demo mode: auto-login
  await loginAsDemo()
  redirect("/dashboard")
}
