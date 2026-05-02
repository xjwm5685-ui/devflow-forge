export type CliProviderId =
  | "claude-code"
  | "opencode"
  | "openai-codex"
  | "gemini-cli"
  | "aider"
  | "github-copilot"
  | "qwen-code"
  | "cursor-agent"
  | "custom"

export type CliExecutionMode = "read-only" | "workspace-write"

export interface CliProviderDefinition {
  id: CliProviderId
  name: string
  command: string
  versionArgs: string[]
  listModelsArgs: string[] | null
  parseModels: (stdout: string) => string[]
  docsUrl: string
  description: string
  enforcesReadOnly: boolean
  enforcesWriteMode: boolean
  outputFormat: "text" | "claude-json"
  buildArgs: (promptRef: string, options: { model?: string; mode: CliExecutionMode }) => string[]
}

function withModel(args: string[], flag: string, model?: string): string[] {
  return model ? [...args, flag, model] : args
}

function parseLines(stdout: string): string[] {
  return stdout.split("\n").map((l) => l.trim()).filter(Boolean)
}

export const CLI_PROVIDERS: CliProviderDefinition[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    command: "claude",
    versionArgs: ["--version"],
    listModelsArgs: ["--list-models"],
    parseModels: parseLines,
    docsUrl: "https://docs.anthropic.com/en/docs/claude-code/cli-reference",
    description: "Anthropic 官方编码 CLI，支持 --permission-mode 强制只读 / 自动接受写入。",
    enforcesReadOnly: true,
    enforcesWriteMode: true,
    outputFormat: "claude-json",
    buildArgs: (promptRef, { model, mode }) => {
      const args = ["-p", promptRef, "--output-format", "json"]
      args.push("--permission-mode", mode === "workspace-write" ? "acceptEdits" : "plan")
      return withModel(args, "--model", model)
    },
  },
  {
    id: "opencode",
    name: "opencode",
    command: "opencode",
    versionArgs: ["--version"],
    listModelsArgs: ["list", "models"],
    parseModels: parseLines,
    docsUrl: "https://opencode.ai/docs/cli",
    description: "终端原生 AI 编程代理。workspace-write 启用 --dangerously-skip-permissions 自动接受权限确认。",
    enforcesReadOnly: false,
    enforcesWriteMode: true,
    outputFormat: "text",
    buildArgs: (promptRef, { model, mode }) => {
      const args = withModel(["run"], "--model", model)
      if (mode === "workspace-write") args.push("--dangerously-skip-permissions")
      args.push(mode === "read-only" ? "Read-only mode: do not edit files. " + promptRef : promptRef)
      return args
    },
  },
  {
    id: "openai-codex",
    name: "OpenAI Codex CLI",
    command: "codex",
    versionArgs: ["--version"],
    listModelsArgs: null,
    parseModels: () => ["o4-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"],
    docsUrl: "https://github.com/openai/codex",
    description: "OpenAI 本机代码代理。--sandbox 控制只读 / 工作区写入。",
    enforcesReadOnly: true,
    enforcesWriteMode: true,
    outputFormat: "text",
    buildArgs: (promptRef, { model, mode }) => {
      const args = [
        "exec",
        "--skip-git-repo-check",
        "--sandbox", mode === "workspace-write" ? "workspace-write" : "read-only",
        promptRef,
      ]
      return withModel(args, "-m", model)
    },
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    command: "gemini",
    versionArgs: ["--version"],
    listModelsArgs: null,
    parseModels: () => ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
    docsUrl: "https://github.com/google-gemini/gemini-cli",
    description: "Google Gemini 命令行：write 模式启用 --yolo 自动接受工具调用。",
    enforcesReadOnly: false,
    enforcesWriteMode: true,
    outputFormat: "text",
    buildArgs: (promptRef, { model, mode }) => {
      const args = ["-p", promptRef]
      if (mode === "workspace-write") args.push("--yolo")
      return withModel(args, "-m", model)
    },
  },
  {
    id: "aider",
    name: "aider",
    command: "aider",
    versionArgs: ["--version"],
    listModelsArgs: ["--list-models"],
    parseModels: (stdout) => {
      return stdout.split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("-") && !l.startsWith("#") && l.includes("/"))
    },
    docsUrl: "https://aider.chat/docs/usage.html",
    description: "成熟的代码库编辑 CLI，read-only 走 ask 模式，workspace-write 走默认 code 模式。",
    enforcesReadOnly: true,
    enforcesWriteMode: true,
    outputFormat: "text",
    buildArgs: (promptRef, { mode }) => {
      const args = ["--message", promptRef, "--yes", "--no-auto-commits"]
      return mode === "read-only" ? [...args, "--chat-mode", "ask"] : args
    },
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot CLI",
    command: "copilot",
    versionArgs: ["--version"],
    listModelsArgs: null,
    parseModels: () => ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "claude-sonnet-4"],
    docsUrl: "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference",
    description: "GitHub Copilot 的命令行入口，复用已有 GitHub/Copilot 登录态。",
    enforcesReadOnly: false,
    enforcesWriteMode: false,
    outputFormat: "text",
    buildArgs: (promptRef) => ["-p", promptRef],
  },
  {
    id: "qwen-code",
    name: "Qwen Code",
    command: "qwen",
    versionArgs: ["--version"],
    listModelsArgs: null,
    parseModels: () => ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-coder-plus-latest"],
    docsUrl: "https://github.com/QwenLM/qwen-code",
    description: "通义千问代码 CLI，flag 与 Gemini 风格兼容，写入需 --yolo。",
    enforcesReadOnly: false,
    enforcesWriteMode: true,
    outputFormat: "text",
    buildArgs: (promptRef, { model, mode }) => {
      const args = ["-p", promptRef]
      if (mode === "workspace-write") args.push("--yolo")
      return withModel(args, "-m", model)
    },
  },
  {
    id: "cursor-agent",
    name: "Cursor Agent",
    command: "cursor-agent",
    versionArgs: ["--version"],
    listModelsArgs: null,
    parseModels: () => ["claude-sonnet-4", "gpt-4o", "gemini-2.5-pro"],
    docsUrl: "https://docs.cursor.com/cli",
    description: "Cursor 终端 agent。写入由 Cursor 内部权限控制。",
    enforcesReadOnly: false,
    enforcesWriteMode: false,
    outputFormat: "text",
    buildArgs: (promptRef, { model }) => withModel(["-p", promptRef], "--model", model),
  },
]

export function getCliProvider(id: string): CliProviderDefinition | null {
  return CLI_PROVIDERS.find((provider) => provider.id === id) ?? null
}

export function listCliProviderSummaries(): Array<{
  id: string
  name: string
  description: string
  docsUrl: string
  enforcesReadOnly: boolean
  enforcesWriteMode: boolean
}> {
  return CLI_PROVIDERS.map(({ id, name, description, docsUrl, enforcesReadOnly, enforcesWriteMode }) => ({
    id,
    name,
    description,
    docsUrl,
    enforcesReadOnly,
    enforcesWriteMode,
  }))
}
