import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import type { AgentName } from "@devflow/shared"
import { getConfigDir } from "@/lib/settings"

export interface CustomAgent {
  id: string
  userId: string
  name: string
  role: string
  description: string
  systemPrompt: string
  model: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
}

export type CustomAgentInput = Pick<CustomAgent, "name" | "role" | "description" | "systemPrompt" | "model" | "color" | "icon">

const CONFIG_DIR = getConfigDir()
const STORE_FILE = join(CONFIG_DIR, "custom-agents.json")
const LEGACY_STORE_FILE = join(process.cwd(), ".custom-agents.json")
const DEFAULT_COLOR = "#38bdf8"

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

let writeLock = Promise.resolve()

function withLock<T>(fn: () => T): Promise<T> {
  const prev = writeLock
  let resolve: () => void
  writeLock = new Promise((r) => { resolve = r })
  return prev.then(() => {
    try {
      return fn()
    } finally {
      resolve!()
    }
  })
}

function readStore(): CustomAgent[] {
  const file = existsSync(STORE_FILE) ? STORE_FILE
    : existsSync(LEGACY_STORE_FILE) ? LEGACY_STORE_FILE
    : null

  if (!file) return []

  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8")) as CustomAgent[]
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn("[CustomAgents] Failed to read agent store:", err instanceof Error ? err.message : err)
    return []
  }
}

function writeStore(agents: CustomAgent[]): void {
  ensureConfigDir()
  writeFileSync(STORE_FILE, JSON.stringify(agents, null, 2))
}

function normalizeInput(input: Partial<CustomAgentInput>): CustomAgentInput {
  return {
    name: String(input.name ?? "").trim(),
    role: String(input.role ?? "").trim() || "custom",
    description: String(input.description ?? "").trim(),
    systemPrompt: String(input.systemPrompt ?? "").trim(),
    model: String(input.model ?? "").trim(),
    color: String(input.color ?? "").trim() || DEFAULT_COLOR,
    icon: String(input.icon ?? "").trim() || "bot",
  }
}

export function toAgentName(id: string): AgentName {
  return `custom:${id}` as AgentName
}

export function fromAgentName(value: string | undefined): string | null {
  if (!value?.startsWith("custom:")) return null
  const id = value.slice("custom:".length)
  return id || null
}

export function listCustomAgents(userId: string): CustomAgent[] {
  return readStore()
    .filter((agent) => agent.userId === userId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getCustomAgent(userId: string, id: string): CustomAgent | null {
  return readStore().find((agent) => agent.userId === userId && agent.id === id) ?? null
}

export async function createCustomAgent(userId: string, input: Partial<CustomAgentInput>): Promise<CustomAgent> {
  return withLock(() => {
    const normalized = normalizeInput(input)
    if (!normalized.name) throw new Error("Agent name is required.")
    if (!normalized.systemPrompt) throw new Error("System prompt is required.")

    const now = new Date().toISOString()
    const agent: CustomAgent = {
      id: crypto.randomUUID(),
      userId,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    }

    const agents = readStore()
    agents.push(agent)
    writeStore(agents)
    return agent
  })
}

export async function updateCustomAgent(userId: string, id: string, input: Partial<CustomAgentInput>): Promise<CustomAgent> {
  return withLock(() => {
    const agents = readStore()
    const index = agents.findIndex((agent) => agent.userId === userId && agent.id === id)
    if (index === -1) throw new Error("Custom agent not found.")

    const current = agents[index]!
    const next: CustomAgent = {
      ...current,
      ...normalizeInput({ ...current, ...input }),
      updatedAt: new Date().toISOString(),
    }

    if (!next.name) throw new Error("Agent name is required.")
    if (!next.systemPrompt) throw new Error("System prompt is required.")

    agents[index] = next
    writeStore(agents)
    return next
  })
}

export async function deleteCustomAgent(userId: string, id: string): Promise<boolean> {
  return withLock(() => {
    const agents = readStore()
    const next = agents.filter((agent) => !(agent.userId === userId && agent.id === id))
    writeStore(next)
    return next.length !== agents.length
  })
}
