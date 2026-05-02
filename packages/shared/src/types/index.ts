import type { WorkflowNodeData, WorkflowNode, WorkflowEdge } from "../validators"

export type BuiltInAgentName = "architect" | "coder" | "qa" | "devops"
export type AgentName = BuiltInAgentName | `custom:${string}`

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

export interface WorkflowDefinition {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

export type TaskStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
export type TaskType = "REFACTOR" | "GENERATE_CODE" | "RUN_TESTS" | "DEPLOY" | "GENERATE_DOCS" | "FULL_PIPELINE"

export type DeployStatus = "PENDING" | "BUILDING" | "PUSHING" | "DEPLOYING" | "RUNNING" | "FAILED" | "STOPPED"

export type DocumentStatus = "DRAFT" | "GENERATING" | "COMPLETED" | "FAILED"

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

export interface ContextResult {
  systemPrompt: string
  files: Array<{ path: string; content: string; score: number }>
  totalTokens: number
  compressed: boolean
  omittedFiles: Array<{ path: string; reason: string }>
}
