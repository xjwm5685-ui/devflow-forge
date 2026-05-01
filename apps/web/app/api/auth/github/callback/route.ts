import { loginAsDemo } from "@/lib/auth/mock-auth"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const isDemo = process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production"

  if (!isDemo) {
    // Production: exchange code for real GitHub token
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    if (!code) {
      return NextResponse.json({ error: "Missing code parameter" }, { status: 400 })
    }
    // TODO: exchange code with GitHub OAuth, upsert user, create session
    return NextResponse.json({ error: "Real OAuth not implemented yet" }, { status: 501 })
  }

  await loginAsDemo()
  redirect("/dashboard")
}
