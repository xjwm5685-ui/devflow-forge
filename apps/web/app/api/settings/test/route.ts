import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { callLLM, isLLMConfigured } from "@/lib/ai/client"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isLLMConfigured()) {
    return NextResponse.json({
      ok: false,
      message: "No API key configured. Please add your API key in Settings.",
    })
  }

  try {
    const response = await callLLM(
      [{ role: "user", content: "Say 'Hello from DevFlow Forge!' in exactly 5 words." }],
      { maxTokens: 50, temperature: 0 }
    )

    return NextResponse.json({
      ok: true,
      message: `Connection successful! Model: ${response.model}. Response: "${response.content.slice(0, 100)}"`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({
      ok: false,
      message: `Connection failed: ${msg}`,
    })
  }
}
