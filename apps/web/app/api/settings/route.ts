import { z } from "zod"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import {
  applySettingsToEnv,
  isValidBaseUrl,
  loadSettings,
  saveSettings,
  toPublicSettings,
  type AppSettings,
  type AIRuntime,
  type CliMode,
  type CliFallbackBehavior,
} from "@/lib/settings"
import { listCliProviderSummaries } from "@/lib/ai/cli/runner"

const settingsUpdateSchema = z.object({
  openaiApiKey: z.string().trim().max(500).optional(),
  openaiBaseUrl: z.string().trim().url().optional().or(z.literal("")),
  openaiModel: z.string().trim().max(100).optional(),
  demoMode: z.boolean().optional(),
  aiRuntime: z.enum(["api", "cli"]).optional(),
  cliProvider: z.string().trim().max(50).optional(),
  cliModel: z.string().trim().max(100).optional(),
  cliMode: z.enum(["read-only", "workspace-write"]).optional(),
  cliWorkingDirectory: z.string().trim().max(500).optional(),
  cliTimeoutSeconds: z.number().int().min(15).max(1800).optional(),
  customCliCommand: z.string().trim().max(500).optional(),
  customCliArgs: z.string().trim().max(1000).optional(),
  cliFallbackBehavior: z.enum(["fail", "api", "demo"]).optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = loadSettings()
  return NextResponse.json({
    ...toPublicSettings(settings),
    cliProviders: listCliProviderSummaries(),
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = settingsUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const current = loadSettings()
  const data = parsed.data

  const newBaseUrl = data.openaiBaseUrl ?? current.openaiBaseUrl
  if (newBaseUrl && !isValidBaseUrl(newBaseUrl)) {
    return NextResponse.json(
      { error: "Invalid Base URL. Must be a valid http:// or https:// URL." },
      { status: 400 }
    )
  }

  let apiKey = current.openaiApiKey
  if (typeof data.openaiApiKey === "string" && data.openaiApiKey.length > 0) {
    apiKey = data.openaiApiKey
  }

  const updated: AppSettings = {
    ...current,
    openaiApiKey: apiKey,
    openaiBaseUrl: newBaseUrl,
    openaiModel: data.openaiModel ?? current.openaiModel,
    demoMode: data.demoMode ?? current.demoMode,
    aiRuntime: (data.aiRuntime as AIRuntime) ?? current.aiRuntime,
    cliProvider: data.cliProvider ?? current.cliProvider,
    cliModel: data.cliModel ?? current.cliModel,
    cliMode: (data.cliMode as CliMode) ?? current.cliMode,
    cliWorkingDirectory: data.cliWorkingDirectory ?? current.cliWorkingDirectory,
    cliTimeoutSeconds: data.cliTimeoutSeconds ?? current.cliTimeoutSeconds,
    customCliCommand: data.customCliCommand ?? current.customCliCommand,
    customCliArgs: data.customCliArgs ?? current.customCliArgs,
    cliFallbackBehavior: (data.cliFallbackBehavior as CliFallbackBehavior) ?? current.cliFallbackBehavior,
  }

  await saveSettings(updated)
  applySettingsToEnv(updated)

  return NextResponse.json({ success: true })
}
