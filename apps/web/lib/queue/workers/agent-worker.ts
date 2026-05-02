import { orchestrator } from "@/lib/ai/agents/orchestrator"
import { prisma } from "@/lib/db"
import { fetchRepoSnapshot, parseRepo } from "@/lib/github/client"
import { getUserAccessToken } from "@/lib/github/token-store"
import { MOCK_FILES } from "@/lib/github/mock-data"
import { loadSettings } from "@/lib/settings"
import { cleanupCliWorkspace, prepareCliWorkspace } from "@/lib/ai/cli/workspace"

interface WorkflowRecord {
  id: string
  name: string
  definition: string
  projectId: string | null
}

const TEXT_FILE_PATTERN = /\.(cjs|cfg|conf|css|cts|env|go|graphql|html|ini|js|json|jsx|lock|md|mdx|mjs|mts|prisma|py|rs|scss|sh|sql|svg|toml|tsx?|txt|yaml|yml)$/i
const IMPORTANT_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "package-lock.json",
  "yarn.lock",
  "tsconfig.json",
  "tsconfig.base.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "Dockerfile",
  "docker-compose.yml",
  ".env.example",
  ".env.local.example",
  "prisma/schema.prisma",
  "AGENTS.md",
  "CONTRIBUTING.md",
])

function shouldIncludeAgentFile(path: string): boolean {
  if (IMPORTANT_FILES.has(path)) return true
  return TEXT_FILE_PATTERN.test(path)
}

async function loadGitHubProjectFiles(task: {
  userId: string
  project: { githubRepo: string | null; githubBranch: string | null }
}): Promise<Array<{ path: string; content: string }> | null> {
  const repoRef = parseRepo(task.project.githubRepo)
  if (!repoRef) return null

  const token = await getUserAccessToken(task.userId)
  if (!token) return null

  const branch = task.project.githubBranch ?? "main"
  const files = await fetchRepoSnapshot({
    token,
    owner: repoRef.owner,
    repo: repoRef.repo,
    branch,
    fileFilter: shouldIncludeAgentFile,
    maxFiles: 60,
    maxBytesPerFile: 150_000,
    maxScannedDirs: 60,
  })    

  return files  .length > 0 ? files.map(({ path, content }) => ({ path, content })) : null
}

export async function processWorkflowTask(taskId: string, workflow: WorkflowRecord): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  })

  if (!task) {
    console.error(`Task ${taskId} not found`)
    return
  }

  const workflowDef = JSON.parse(workflow.definition)
  let files = MOCK_FILES
  try {
    files = await loadGitHubProjectFiles(task) ?? MOCK_FILES
  } catch (error) {
    console.error("[AgentWorker] Failed to load GitHub files, using demo context:", error)
  }

  const settings = loadSettings()
  let cliWorkspace: string | null = null
  if (settings.aiRuntime === "cli" && !settings.demoMode) {
    try {
      cliWorkspace = await prepareCliWorkspace(taskId, files)
    } catch (error) {
      console.error("[AgentWorker] Failed to materialize CLI workspace:", error)
    }
  }

  try {
    await orchestrator.executeWorkflow({
      taskId,
      userId: task.userId,
      workflow: workflowDef,
      input: (() => {
        try {
          const parsed = task.input ? JSON.parse(task.input) : null
          if (parsed && typeof parsed === "object") {
            const prompt = parsed.prompt ?? parsed.task ?? parsed.description ?? parsed.message
            if (typeof prompt === "string" && prompt.trim()) return prompt.trim()
          }
          if (typeof task.input === "string" && task.input.trim() && task.input.trim() !== "{}") return task.input.trim()
        } catch (err) {
          console.warn("[AgentWorker] Failed to parse task input:", err)
          if (typeof task.input === "string" && task.input.trim()) return task.input.trim()
        }
        return "Execute workflow"
      })(),
      files,
      cliWorkspace: cliWorkspace ?? undefined,
    })
  } finally {
    if (cliWorkspace) {
      await cleanupCliWorkspace(cliWorkspace)
    }
  }
}
