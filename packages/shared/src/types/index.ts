// Agent types
export type AgentName = "architect" | "coder" | "qa" | "devops"

export interface AgentMessage {
  id: string
  taskId: string
  from: AgentName | "orchestrator" | "user"
  to: AgentName | "orchestrator" | "user"
  type: "request" | "response" | "status" | "error" | "tool_call" | "tool_result"
  content: string
  metadata: {
    tokenUsage?: { input: number; output: number }
    toolCalls?: ToolCall[]
    timestamp: number
  }
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: string
}

// Workflow types
export interface WorkflowNodeData {
  type: "trigger" | "agent" | "condition" | "deploy"
  label: string
  agentName?: AgentName
  prompt?: string
  model?: string
  maxIterations?: number
  expression?: string
  environment?: string
  provider?: string
  status?: "idle" | "running" | "done" | "error"
  output?: string
}

export interface WorkflowDefinition {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: WorkflowNodeData
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    type?: string
    animated?: boolean
  }>
  viewport?: { x: number; y: number; zoom: number }
}

// Task types
export type TaskStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
export type TaskType = "REFACTOR" | "GENERATE_CODE" | "RUN_TESTS" | "DEPLOY" | "GENERATE_DOCS" | "FULL_PIPELINE"

// Deployment types
export type DeployStatus = "PENDING" | "BUILDING" | "PUSHING" | "DEPLOYING" | "RUNNING" | "FAILED" | "STOPPED"

// Document types
export type DocumentStatus = "DRAFT" | "GENERATING" | "COMPLETED" | "FAILED"

// GitHub types
export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  description: string | null
  private: boolean
  defaultBranch: string
  language: string | null
  updatedAt: string
}

export interface GitHubFile {
  path: string
  type: "file" | "dir"
  size?: number
  sha?: string
  content?: string
}

// Agent result types
export interface AgentResult {
  success: boolean
  content: string
  artifacts?: Array<{
    type: "file_change" | "diagram" | "test_result" | "deploy_config"
    name: string
    content: string
  }>
  tokenUsage: { input: number; output: number }
}

// Context types
export interface ContextResult {
  systemPrompt: string
  files: Array<{ path: string; content: string; score: number }>
  totalTokens: number
  compressed: boolean
  omittedFiles: Array<{ path: string; reason: string }>
}
