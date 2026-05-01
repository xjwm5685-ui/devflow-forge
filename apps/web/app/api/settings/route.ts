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

// Allowlist of trusted API base URLs
const ALLOWED_BASE_URLS = [
  "https://api.openai.com/v1",
  "https://api.deepseek.com/v1",
  "https://api.xiaomi.com/v1",
  "https://api.moonshot.cn/v1",
  "https://open.bigmodel.cn/api/paas/v4",
  "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "http://localhost:11434/v1",   // Ollama
  "http://localhost:11435/v1",   // Ollama alt
  "http://127.0.0.1:11434/v1",  // Ollama loopback
]

function isAllowedBaseUrl(url: string): boolean {
  return ALLOWED_BASE_URLS.some((allowed) => url === allowed)
}

function loadSettings(): Settings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, "utf-8")
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

function saveSettings(settings: Settings): void {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
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

  // Validate base URL against allowlist
  const newBaseUrl = body.openaiBaseUrl ?? current.openaiBaseUrl
  if (newBaseUrl && !isAllowedBaseUrl(newBaseUrl)) {
    return NextResponse.json(
      { error: "Base URL not in allowlist. Add it to ALLOWED_BASE_URLS in route.ts first." },
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
