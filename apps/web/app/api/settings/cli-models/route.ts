import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { getCliProvider } from "@/lib/ai/cli/providers"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const providerId = url.searchParams.get("provider")

  if (!providerId || providerId === "custom") {
    return NextResponse.json({ models: [] })
  }

  const provider = getCliProvider(providerId)
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 })
  }

  if (!provider.listModelsArgs) {
    return NextResponse.json({ models: provider.parseModels(""), source: "builtin" })
  }

  try {
    const models = await new Promise<string[]>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 10_000)
      execFile(
        provider.command,
        provider.listModelsArgs!,
        { timeout: 10_000, maxBuffer: 1024 * 1024 },
        (error, stdout, stderr) => {
          clearTimeout(timeout)
          if (error) {
            console.warn(`[CliModels] ${provider.command} ${provider.listModelsArgs!.join(" ")} failed:`, error.message)
            resolve(provider.parseModels(""))
            return
          }
          resolve(provider.parseModels(stdout || stderr))
        }
      )
    })

    return NextResponse.json({ models, source: "cli" })
  } catch (err) {
    console.warn("[CliModels] Failed to list models:", err instanceof Error ? err.message : err)
    return NextResponse.json({ models: provider.parseModels(""), source: "builtin" })
  }
}
