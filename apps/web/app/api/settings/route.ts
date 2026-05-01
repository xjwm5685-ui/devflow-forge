import { NextResponse } from "next/server"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { getSession } from "@/lib/auth/session"

const SETTINGS_FILE = join(process.cwd(), ".settings.json")

interface Settings {
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  demoMode: boolean
}

const DEFAULT_SETTINGS: Settings = {
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o",
  demoMode: true,
}

function isValidBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

function loadSettings(): Settings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, "utf-8")
      const parsed = JSON.parse(raw) as Record<string, unknown>
      // Decode base64-encoded API key
      if (typeof parsed.openaiApiKey === "string" && parsed.openaiApiKey.startsWith("b64:")) {
        parsed.openaiApiKey = Buffer.from(parsed.openaiApiKey.slice(4), "base64").toString("utf-8")
      }
      return { ...DEFAULT_SETTINGS, ...parsed } as Settings
    }
  } catch {}
  return DEFAULT_SETTINGS
}

function saveSettings(settings: Settings): void {
  const toSave = { ...settings }
  // Obfuscate API key with base64 (not encryption, but avoids plaintext)
  if (toSave.openaiApiKey) {
    toSave.openaiApiKey = "b64:" + Buffer.from(toSave.openaiApiKey, "utf-8").toString("base64")
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2))
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = loadSettings()
  return NextResponse.json({
    openaiBaseUrl: settings.openaiBaseUrl,
    openaiModel: settings.openaiModel,
    demoMode: settings.demoMode,
    hasApiKey: !!settings.openaiApiKey,
    // Never expose the actual key
    openaiApiKey: "",
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const current = loadSettings()

  // Validate base URL format
  const newBaseUrl = body.openaiBaseUrl ?? current.openaiBaseUrl
  if (newBaseUrl && !isValidBaseUrl(newBaseUrl)) {
    return NextResponse.json(
      { error: "Invalid Base URL. Must be a valid http:// or https:// URL." },
      { status: 400 }
    )
  }

  const updated: Settings = {
    openaiApiKey: body.openaiApiKey ?? current.openaiApiKey,
    openaiBaseUrl: newBaseUrl,
    openaiModel: body.openaiModel ?? current.openaiModel,
    demoMode: body.demoMode ?? current.demoMode,
  }

  // Only update key if a new non-empty value is provided
  if (body.openaiApiKey && body.openaiApiKey.length > 0) {
    updated.openaiApiKey = body.openaiApiKey
  }

  saveSettings(updated)

  // Update process.env for immediate effect
  process.env.OPENAI_API_KEY = updated.openaiApiKey
  process.env.OPENAI_BASE_URL = updated.openaiBaseUrl
  process.env.OPENAI_MODEL = updated.openaiModel
  process.env.DEMO_MODE = updated.demoMode ? "true" : "false"

  return NextResponse.json({ success: true })
}
