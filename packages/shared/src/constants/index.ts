import type { AgentName } from "../types/index"

export const AGENT_NAMES: AgentName[] = ["architect", "coder", "qa", "devops"]

export const AGENT_CONFIG: Record<AgentName, { label: string; color: string; icon: string; description: string }> = {
  architect: {
    label: "Architect",
    color: "#8b5cf6",
    icon: "🏗️",
    description: "Analyzes requirements and designs system architecture",
  },
  coder: {
    label: "Coder",
    color: "#3b82f6",
    icon: "💻",
    description: "Implements code changes based on the architect's plan",
  },
  qa: {
    label: "QA Engineer",
    color: "#10b981",
    icon: "🧪",
    description: "Reviews code, generates tests, and validates correctness",
  },
  devops: {
    label: "DevOps",
    color: "#f59e0b",
    icon: "🚀",
    description: "Handles deployment, CI/CD, and infrastructure",
  },
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
}

export const TASK_TYPE_LABELS: Record<string, string> = {
  REFACTOR: "Code Refactor",
  GENERATE_CODE: "Code Generation",
  RUN_TESTS: "Run Tests",
  DEPLOY: "Deploy",
  GENERATE_DOCS: "Generate Documentation",
  FULL_PIPELINE: "Full Pipeline",
}

export const DEFAULT_MODEL = "gpt-4o"
export const DEFAULT_CONTEXT_BUDGET = 100_000
export const MAX_AGENT_RETRIES = 3
