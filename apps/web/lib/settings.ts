import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { getSessionSecret } from "./auth/secret"

export type AIRuntime = "api" | "cli"
export type CliMode = "read-only" | "workspace-write"
export type CliFallbackBehavior = "fail" | "api" | "demo"

export interface AppSettings {
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  demoMode: boolean
  aiRuntime: AIRuntime
  cliProvider: string
  cliModel: string
  cliMode: CliMode
  cliWorkingDirectory: string
  cliTimeoutSeconds: number
  customCliCommand: string
  customCliArgs: string
  cliFallbackBehavior: CliFallbackBehavior
}

export interface PublicAppSettings extends Omit<AppSettings, "openaiApiKey"> {
  hasApiKey: boolean
  openaiApiKey: ""
}

export function getConfigDir(): string {
  return process.env.CONFIG_DIR || join(process.cwd(), ".settings")
}

function ensureConfigDir(): void {
  const dir = getConfigDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

const CONFIG_DIR = getConfigDir()
const SETTINGS_FILE = join(CONFIG_DIR, "settings.json")
const LEGACY_SETTINGS_FILE = join(process.cwd(), ".settings.json")
const API_KEY_PREFIX = "enc:v1:"
const IV_LEN = 12
const TAG_LEN = 16

let settingsWriteLock = Promise.resolve()

function withSettingsLock<T>(fn: () => T): Promise<T> {
  const prev = settingsWriteLock
  let resolve: () => void
  settingsWriteLock = new Promise((r) => { resolve = r })
  return prev.then(() => {
    try {
      return fn()
    } finally {
      resolve!()
    }
  })
}

export const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o",
  demoMode: true,
  aiRuntime: "api",
  cliProvider: "claude-code",
  cliModel: "",
  cliMode: "read-only",
  cliWorkingDirectory: "",
  cliTimeoutSeconds: 300,
  customCliCommand: "",
  customCliArgs: "",
  cliFallbackBehavior: "fail",
}

export function isValidBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

function getEncryptionKey(): Buffer {
  const explicit = process.env.SETTINGS_ENCRYPTION_KEY
  if (explicit) {
    if (/^[0-9a-fA-F]{64}$/.test(explicit)) return Buffer.from(explicit, "hex")
    const buf = Buffer.from(explicit, "base64")
    if (buf.length === 32) return buf
    return createHash("sha256").update(explicit).digest()
  }
  return createHash("sha256")
    .update(Buffer.from(getSessionSecret()))
    .update("settings-store/v1")
    .digest()
}

function encryptApiKey(plaintext: string): string {
  if (!plaintext) return ""
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return API_KEY_PREFIX + Buffer.concat([iv, ct, tag]).toString("base64")
}

function decryptApiKey(stored: string): string {
  if (!stored) return ""
  if (stored.startsWith("b64:")) {
    return Buffer.from(stored.slice(4), "base64").toString("utf-8")
  }
  if (!stored.startsWith(API_KEY_PREFIX)) return stored
  try {
    const payload = Buffer.from(stored.slice(API_KEY_PREFIX.length), "base64")
    if (payload.length <= IV_LEN + TAG_LEN) return ""
    const iv = payload.subarray(0, IV_LEN)
    const tag = payload.subarray(payload.length - TAG_LEN)
    const ct = payload.subarray(IV_LEN, payload.length - TAG_LEN)
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv)
    decipher.setAuthTag(tag)
    const pt = Buffer.concat([decipher.update(ct), decipher.final()])
    return pt.toString("utf8")
  } catch (err) {
    console.error("[Settings] Failed to decrypt API key:", err instanceof Error ? err.message : err)
    return ""
  }
}

function normalizeSettings(raw: Partial<AppSettings>): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...raw }
  return {
    ...merged,
    aiRuntime: merged.aiRuntime === "cli" ? "cli" : "api",
    cliMode: merged.cliMode === "workspace-write" ? "workspace-write" : "read-only",
    cliTimeoutSeconds: Math.min(Math.max(Number(merged.cliTimeoutSeconds) || 300, 15), 1800),
    cliFallbackBehavior: merged.cliFallbackBehavior === "api" || merged.cliFallbackBehavior === "demo"
      ? merged.cliFallbackBehavior
      : "fail",
  }
}

export function loadSettings(): AppSettings {
  const file = existsSync(SETTINGS_FILE) ? SETTINGS_FILE
    : existsSync(LEGACY_SETTINGS_FILE) ? LEGACY_SETTINGS_FILE
    : null

  if (file) {
    try {
      const raw = JSON.parse(readFileSync(file, "utf-8")) as Partial<AppSettings>
      const parsed = { ...raw }
      if (typeof parsed.openaiApiKey === "string") {
        parsed.openaiApiKey = decryptApiKey(parsed.openaiApiKey)
      }
      return normalizeSettings(parsed)
    } catch (err) {
      console.error("[Settings] Failed to load settings file:", err instanceof Error ? err.message : err)
    }
  }

  return normalizeSettings({
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? DEFAULT_SETTINGS.openaiBaseUrl,
    openaiModel: process.env.OPENAI_MODEL ?? DEFAULT_SETTINGS.openaiModel,
    demoMode: process.env.DEMO_MODE === "true",
    aiRuntime: process.env.AI_RUNTIME === "cli" ? "cli" : "api",
    cliProvider: process.env.AI_CLI_PROVIDER ?? DEFAULT_SETTINGS.cliProvider,
    cliModel: process.env.AI_CLI_MODEL ?? "",
    cliMode: process.env.AI_CLI_MODE === "workspace-write" ? "workspace-write" : "read-only",
    cliWorkingDirectory: process.env.AI_CLI_WORKDIR ?? "",
    cliTimeoutSeconds: Number(process.env.AI_CLI_TIMEOUT_SECONDS) || DEFAULT_SETTINGS.cliTimeoutSeconds,
    customCliCommand: process.env.AI_CLI_CUSTOM_COMMAND ?? "",
    customCliArgs: process.env.AI_CLI_CUSTOM_ARGS ?? "",
    cliFallbackBehavior: (process.env.AI_CLI_FALLBACK as CliFallbackBehavior | undefined) ?? DEFAULT_SETTINGS.cliFallbackBehavior,
  })
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return withSettingsLock(() => {
    const normalized = normalizeSettings(settings)
    const toSave: AppSettings = { ...normalized }

    toSave.openaiApiKey = encryptApiKey(toSave.openaiApiKey)

    ensureConfigDir()
    writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2))
  })
}

export function toPublicSettings(settings: AppSettings): PublicAppSettings {
  return {
    ...settings,
    hasApiKey: !!settings.openaiApiKey,
    openaiApiKey: "",
  }
}

export function applySettingsToEnv(settings: AppSettings): void {
  process.env.OPENAI_API_KEY = settings.openaiApiKey
  process.env.OPENAI_BASE_URL = settings.openaiBaseUrl
  process.env.OPENAI_MODEL = settings.openaiModel
  process.env.DEMO_MODE = settings.demoMode ? "true" : "false"
  process.env.AI_RUNTIME = settings.aiRuntime
  process.env.AI_CLI_PROVIDER = settings.cliProvider
  process.env.AI_CLI_MODEL = settings.cliModel
  process.env.AI_CLI_MODE = settings.cliMode
  process.env.AI_CLI_WORKDIR = settings.cliWorkingDirectory
  process.env.AI_CLI_TIMEOUT_SECONDS = String(settings.cliTimeoutSeconds)
  process.env.AI_CLI_CUSTOM_COMMAND = settings.customCliCommand
  process.env.AI_CLI_CUSTOM_ARGS = settings.customCliArgs
  process.env.AI_CLI_FALLBACK = settings.cliFallbackBehavior
}
