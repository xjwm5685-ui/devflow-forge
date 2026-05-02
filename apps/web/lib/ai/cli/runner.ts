import { spawn } from "child_process"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import { homedir, tmpdir } from "os"
import { isAbsolute, join } from "path"
import type { AgentMessage, ContextResult } from "@devflow/shared"
import type { AppSettings } from "@/lib/settings"
import { CLI_PROVIDERS, getCliProvider } from "./providers"
import { isSafeWritableCwd } from "./workspace"

export interface CliRunInput {
  agentName: string
  systemPrompt: string
  input: string
  context: ContextResult
  history: AgentMessage[]
  settings: AppSettings
  /** Per-task workspace (preferred). Wins over settings.cliWorkingDirectory. */
  workspaceOverride?: string
}

export interface CliRunResult {
  provider: string
  command: string
  cwd: string
  stdout: string
  stderr: string
  content: string
  durationMs: number
  /** Real token counts when the provider's output format includes them; null otherwise. */
  tokenUsage: { input: number; output: number } | null
}

interface SpawnResult {
  stdout: string
  stderr: string
  code: number | null
  durationMs: number
  command: string
}

const PROMPT_FILE_DIR = join(tmpdir(), "devflow-forge-cli")

function estimateCharsForTokens(tokens: number): number {
  return Math.max(1000, tokens * 4)
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return value.slice(0, maxChars) + "\n\n[truncated by DevFlow Forge]"
}

function buildPromptFile(input: CliRunInput, workspaceCwd: string): string {
  const contextBudget = estimateCharsForTokens(45_000)
  const files = input.context.files.map((file) => {
    return `--- FILE: ${file.path}\n${truncate(file.content, 12_000)}`
  }).join("\n\n")

  const history = input.history
    .filter((message) => message.type === "response" || message.type === "request")
    .slice(-8)
    .map((message) => `[${message.from} -> ${message.to}]\n${truncate(message.content, 3000)}`)
    .join("\n\n")

  const modeInstruction = input.settings.cliMode === "workspace-write"
    ? `Workspace-write is enabled. You may edit files inside the working directory (${workspaceCwd}). Do not run destructive commands or commit anything.`
    : `Read-only mode is enabled. Do not edit files, create commits, or run destructive commands. Return the proposed changes, commands, and patch content in stdout.`

  return `# DevFlow Forge CLI Agent Task

## Agent
${input.agentName}

## Working Directory
${workspaceCwd}

## Execution Mode
${input.settings.cliMode}

${modeInstruction}

## System Prompt
${input.systemPrompt}

## User Task
${input.input}

## Conversation History
${history || "No prior agent output."}

## Repository Context
${truncate(files || "No repository files were loaded.", contextBudget)}

## Output Contract
Return a concise final answer in stdout. Include file paths, commands run, test results, and any generated code blocks with filename markers when relevant.`
}

/**
 * Resolve the cwd for a CLI run. Priority:
 *   1. workspaceOverride (per-task materialized workspace)
 *   2. settings.cliWorkingDirectory (user-provided absolute path)
 *   3. AI_CLI_WORKDIR env
 *   4. tmpdir + "/devflow-cli-fallback" (NEVER process.cwd() of the app)
 *
 * In workspace-write mode, the resolved cwd is rejected if it overlaps the
 * DevFlow Forge app source. Returns { cwd, safe } so the caller can refuse
 * to run rather than silently editing the wrong directory.
 */
function resolveCwd(
  settings: AppSettings,
  workspaceOverride: string | undefined
): { cwd: string; source: "override" | "configured" | "env" | "fallback" } {
  if (workspaceOverride && isAbsolute(workspaceOverride)) {
    return { cwd: workspaceOverride, source: "override" }
  }

  const configured = settings.cliWorkingDirectory.trim()
  if (configured && isAbsolute(configured)) {
    return { cwd: configured, source: "configured" }
  }

  const envWorkdir = process.env.AI_CLI_WORKDIR?.trim()
  if (envWorkdir && isAbsolute(envWorkdir)) {
    return { cwd: envWorkdir, source: "env" }
  }

  const fallback = join(tmpdir(), "devflow-cli-fallback")
  mkdirSync(fallback, { recursive: true })
  return { cwd: fallback, source: "fallback" }
}

function createPromptFile(content: string): string {
  mkdirSync(PROMPT_FILE_DIR, { recursive: true })
  const path = join(PROMPT_FILE_DIR, `task-${Date.now()}-${Math.random().toString(36).slice(2)}.md`)
  writeFileSync(path, content, "utf-8")
  return path
}

function splitArgs(value: string): string[] {
  const args: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(value)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3] ?? "")
  }
  return args
}

function fillTemplate(value: string, replacements: Record<string, string>): string {
  return value.replace(/\{\{\s*(prompt|promptFile|mode|model)\s*\}\}/g, (_, key: string) => replacements[key] ?? "")
}

function buildCustomCommand(settings: AppSettings, promptRef: string, promptFile: string): { command: string; args: string[] } {
  const command = settings.customCliCommand.trim()
  if (!command) throw new Error("Custom CLI command is empty.")

  const replacements: Record<string, string> = {
    prompt: promptRef,
    promptFile,
    mode: settings.cliMode,
  }
  if (settings.cliModel) replacements.model = settings.cliModel

  const rawArgs = settings.customCliArgs.trim()
  const args = rawArgs
    ? splitArgs(fillTemplate(rawArgs, replacements))
    : [promptRef]

  return { command, args }
}

function quoteCmdArg(value: string): string {
  if (value.length === 0) return "\"\""
  return `"${value.replace(/(["^&|<>])/g, "^$1")}"`
}

function quoteCmdCommand(value: string): string {
  return /[\s"&|<>]/.test(value) ? quoteCmdArg(value) : value
}

function getPathKey(env: NodeJS.ProcessEnv): string {
  return Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH"
}

const SAFE_SPAWN_ENV_KEYS = new Set([
  "PATH", "Path", "path",
  "HOME", "USERPROFILE", "HOMEPATH",
  "TEMP", "TMP",
  "LANG", "LC_ALL", "LC_CTYPE",
  "TERM", "COLORTERM",
  "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME",
  "APPDATA", "LOCALAPPDATA",
  "PROGRAMFILES", "PROGRAMFILES(X86)",
  "SYSTEMROOT", "COMSPEC",
  "NODE", "NVM_DIR", "NVM_HOME",
  "EDITOR", "VISUAL",
  "SHELL",
  "NODE_ENV",
])

function buildSpawnEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV ?? "production" }
  for (const key of Object.keys(process.env)) {
    if (SAFE_SPAWN_ENV_KEYS.has(key)) {
      env[key] = process.env[key]
    }
  }

  if (process.platform === "win32") {
    const pathKey = getPathKey(env)
    const currentPath = env[pathKey] ?? ""
    const additions = [
      process.env.APPDATA ? join(process.env.APPDATA, "npm") : "",
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "pnpm") : "",
    ].filter(Boolean)

    const currentParts = currentPath.split(";").map((part) => part.toLowerCase())
    const missing = additions.filter((part) => !currentParts.includes(part.toLowerCase()))
    if (missing.length > 0) {
      env[pathKey] = [currentPath, ...missing].filter(Boolean).join(";")
    }
  }

  return env
}

function shouldRunThroughCmd(command: string): boolean {
  if (process.platform !== "win32") return false
  return !/\.(exe)$/i.test(command)
}

function spawnCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<SpawnResult> {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    let childCommand = command
    let childArgs = args

    if (shouldRunThroughCmd(command)) {
      childCommand = "cmd.exe"
      childArgs = ["/d", "/c", [quoteCmdCommand(command), ...args.map(quoteCmdArg)].join(" ")]
    }

    const child = spawn(childCommand, childArgs, {
      cwd,
      env: buildSpawnEnv(),
      windowsHide: true,
      shell: false,
    })

    let stdout = ""
    let stderr = ""
    let settled = false

    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      if (!settled) {
        settled = true
        reject(new Error(`CLI timed out after ${Math.floor(timeoutMs / 1000)} seconds.`))
      }
    }, timeoutMs)

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      if (!settled) {
        settled = true
        reject(error)
      }
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (!settled) {
        settled = true
        resolve({ stdout, stderr, code, durationMs: Date.now() - startedAt, command })
      }
    })
  })
}

function getCommandCandidates(command: string): string[] {
  if (process.platform !== "win32") return [command]
  if (/[\\/]/.test(command) || /\.(exe|cmd|bat|ps1)$/i.test(command)) return [command]

  const candidates = [
    command,
    `${command}.cmd`,
    process.env.APPDATA ? join(process.env.APPDATA, "npm", `${command}.cmd`) : "",
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "pnpm", `${command}.cmd`) : "",
  ].filter(Boolean)

  return Array.from(new Set(candidates))
}

function isCommandNotFound(output: string): boolean {
  return /not recognized|command not found|not found|ENOENT|找不到|不是内部或外部命令/i.test(output)
}

async function spawnWithFallbacks(command: string, args: string[], cwd: string, timeoutMs: number): Promise<SpawnResult> {
  const candidates = getCommandCandidates(command)
  const failures: string[] = []

  for (const candidate of candidates) {
    try {
      const result = await spawnCommand(candidate, args, cwd, timeoutMs)
      if (result.code === 0 || !isCommandNotFound(`${result.stderr}\n${result.stdout}`)) {
        return result
      }
      failures.push(`${candidate}: ${result.stderr.trim() || result.stdout.trim()}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      if (!isCommandNotFound(message)) throw error
      failures.push(`${candidate}: ${message}`)
    }
  }

  throw new Error(`Command not found. Tried: ${failures.join(" | ")}`)
}

function explainCliFailure(providerId: string, output: string): string {
  if (providerId === "opencode" && /EEXIST|\.config[\\/]opencode/i.test(output)) {
    const configPath = join(homedir(), ".config", "opencode")
    return `${output}\n\nHint: opencode failed while opening its config directory (${configPath}). Make sure DevFlow is running as the same Windows user that owns this opencode config, or repair that directory's permissions. As a workaround, set XDG_CONFIG_HOME to a writable directory and run opencode providers there once.`
  }
  return output
}

interface ClaudeJsonResult {
  content: string
  usage: { input: number; output: number } | null
}

function parseClaudeJsonOutput(stdout: string): ClaudeJsonResult | null {
  // Claude Code's `--output-format json` emits a single JSON object on stdout.
  const trimmed = stdout.trim()
  if (!trimmed.startsWith("{")) return null
  try {
    const parsed = JSON.parse(trimmed) as {
      result?: string
      content?: string
      usage?: {
        input_tokens?: number
        output_tokens?: number
        cache_creation_input_tokens?: number
        cache_read_input_tokens?: number
      }
    }
    const content = parsed.result ?? parsed.content ?? ""
    const u = parsed.usage
    const usage = u
      ? {
          input: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
          output: u.output_tokens ?? 0,
        }
      : null
    return { content, usage }
  } catch (err) {
    console.warn("[CliRunner] Failed to parse CLI JSON output:", err)
    return null
  }
}

function extractContent(stdout: string, stderr: string): string {
  const trimmed = stdout.trim()
  if (trimmed) return trimmed
  return stderr.trim()
}

export async function runAiCli(input: CliRunInput): Promise<CliRunResult> {
  const settings = input.settings
  const provider = getCliProvider(settings.cliProvider)
  const { cwd, source } = resolveCwd(settings, input.workspaceOverride)

  if (settings.cliMode === "workspace-write" && !isSafeWritableCwd(cwd)) {
    throw new Error(
      `Refusing to run CLI in workspace-write mode with cwd "${cwd}" (source: ${source}). ` +
      `Set cliWorkingDirectory to an absolute path outside the DevFlow Forge app, or let DevFlow materialize a per-task workspace.`
    )
  }

  const promptFile = createPromptFile(buildPromptFile(input, cwd))
  const promptRef = `Read the full DevFlow Forge task from this file, then perform the requested ${input.agentName} step: ${promptFile}`

  try {
    const commandSpec = settings.cliProvider === "custom"
      ? buildCustomCommand(settings, promptRef, promptFile)
      : (() => {
          if (!provider) throw new Error(`Unknown CLI provider: ${settings.cliProvider}`)
          return {
            command: provider.command,
            args: provider.buildArgs(promptRef, { model: settings.cliModel || undefined, mode: settings.cliMode }),
          }
        })()

    const result = await spawnWithFallbacks(
      commandSpec.command,
      commandSpec.args,
      cwd,
      settings.cliTimeoutSeconds * 1000
    )

    if (result.code !== 0) {
      throw new Error(`CLI exited with code ${result.code}. ${explainCliFailure(settings.cliProvider, result.stderr.trim() || result.stdout.trim())}`)
    }

    let content = extractContent(result.stdout, result.stderr)
    let tokenUsage: { input: number; output: number } | null = null

    if (provider?.outputFormat === "claude-json") {
      const parsed = parseClaudeJsonOutput(result.stdout)
      if (parsed) {
        content = parsed.content || content
        tokenUsage = parsed.usage
      }
    }

    return {
      provider: provider?.name ?? "Custom CLI",
      command: result.command,
      cwd,
      stdout: result.stdout,
      stderr: result.stderr,
      content,
      durationMs: result.durationMs,
      tokenUsage,
    }
  } finally {
    try {
      rmSync(promptFile, { force: true })
    } catch (err) {
      console.warn("[CliRunner] Failed to remove prompt file:", err)
    }
  }
}

export async function checkAiCli(settings: AppSettings): Promise<{ ok: boolean; message: string }> {
  const provider = getCliProvider(settings.cliProvider)
  const command = settings.cliProvider === "custom" ? settings.customCliCommand.trim() : provider?.command
  const args = settings.cliProvider === "custom" ? ["--version"] : provider?.versionArgs

  if (!command || !args) {
    return { ok: false, message: "CLI provider is not configured." }
  }

  try {
    const { cwd } = resolveCwd(settings, undefined)
    const result = await spawnWithFallbacks(command, args, cwd, 10_000)
    const output = (result.stdout || result.stderr).trim()
    if (result.code !== 0) {
      return { ok: false, message: `${command} exited with code ${result.code}: ${explainCliFailure(settings.cliProvider, output)}` }
    }

    return {
      ok: true,
      message: `${provider?.name ?? command} is available. ${output.slice(0, 200) || "Version command succeeded."}`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return {
      ok: false,
      message: `Cannot run ${command}. Install it on this server or set a custom command. ${msg}`,
    }
  }
}

export function listCliProviderSummaries() {
  return CLI_PROVIDERS.map(({ id, name, description, docsUrl, enforcesReadOnly, enforcesWriteMode }) => ({
    id,
    name,
    description,
    docsUrl,
    enforcesReadOnly,
    enforcesWriteMode,
  }))
}
