import { z } from "zod"

const agentNameSchema = z.union([
  z.enum(["architect", "coder", "qa", "devops"]),
  z.string().regex(/^custom:[a-zA-Z0-9_-]+$/, "Custom agent name must follow 'custom:<id>' format"),
])

const triggerNodeDataSchema = z.object({
  type: z.literal("trigger"),
  label: z.string().min(1),
  status: z.enum(["idle", "running", "done", "error"]).optional(),
  output: z.string().optional(),
})

const agentNodeDataSchema = z.object({
  type: z.literal("agent"),
  label: z.string().min(1),
  agentName: agentNameSchema.optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  maxIterations: z.number().int().positive().optional(),
  status: z.enum(["idle", "running", "done", "error"]).optional(),
  output: z.string().optional(),
})

const conditionNodeDataSchema = z.object({
  type: z.literal("condition"),
  label: z.string().min(1),
  expression: z.string().optional(),
  status: z.enum(["idle", "running", "done", "error"]).optional(),
  output: z.string().optional(),
})

const deployNodeDataSchema = z.object({
  type: z.literal("deploy"),
  label: z.string().min(1),
  environment: z.string().optional(),
  provider: z.string().optional(),
  status: z.enum(["idle", "running", "done", "error"]).optional(),
  output: z.string().optional(),
})

export const workflowNodeDataSchema = z.discriminatedUnion("type", [
  triggerNodeDataSchema,
  agentNodeDataSchema,
  conditionNodeDataSchema,
  deployNodeDataSchema,
])

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["trigger", "agent", "condition", "deploy"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: workflowNodeDataSchema,
})

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
})

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  githubRepo: z.string()
    .regex(/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/, "githubRepo must be in 'owner/repo' format")
    .optional(),
  githubBranch: z.string().optional(),
})

export const updateProjectSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  githubRepo: z.string()
    .regex(/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/, "githubRepo must be in 'owner/repo' format")
    .optional(),
  githubBranch: z.string().optional(),
})

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  projectId: z.string().optional(),
  definition: z.object({
    nodes: z.array(workflowNodeSchema),
    edges: z.array(workflowEdgeSchema),
    viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
  }),
  isTemplate: z.boolean().default(false),
  templateTag: z.string().optional(),
})

export const executeWorkflowSchema = z.object({
  workflowId: z.string(),
  input: z.record(z.unknown()).optional(),
})

export const createTaskSchema = z.object({
  projectId: z.string(),
  workflowId: z.string().optional(),
  type: z.enum(["REFACTOR", "GENERATE_CODE", "RUN_TESTS", "DEPLOY", "GENERATE_DOCS", "FULL_PIPELINE"]),
  input: z.record(z.unknown()),
})

export const generateDocumentSchema = z.object({
  projectId: z.string(),
  title: z.string().trim().min(1).max(200),
  options: z.object({
    includeDiagrams: z.boolean().default(true),
    includeNarration: z.boolean().default(false),
    includeVideo: z.boolean().default(false),
  }),
})

export const deploySchema = z.object({
  projectId: z.string(),
  environment: z.enum(["staging", "production"]).default("staging"),
  provider: z.enum(["docker-local", "aws", "gcp", "vercel"]).default("docker-local"),
})

export const agentMessageSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  from: z.union([
    z.enum(["architect", "coder", "qa", "devops", "orchestrator", "user"]),
    z.string().regex(/^custom:[a-zA-Z0-9_-]+$/),
  ]),
  to: z.union([
    z.enum(["architect", "coder", "qa", "devops", "orchestrator", "user"]),
    z.string().regex(/^custom:[a-zA-Z0-9_-]+$/),
  ]),
  type: z.enum(["request", "response", "status", "error", "tool_call", "tool_result"]),
  content: z.string(),
  metadata: z.object({
    tokenUsage: z.object({ input: z.number(), output: z.number() }).optional(),
    toolCalls: z.array(z.object({
      id: z.string(),
      name: z.string(),
      arguments: z.record(z.unknown()),
      result: z.string().optional(),
    })).optional(),
    timestamp: z.number(),
  }),
})

export const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
  result: z.string().optional(),
})

export const agentResultSchema = z.object({
  success: z.boolean(),
  content: z.string(),
  artifacts: z.array(z.object({
    type: z.enum(["file_change", "diagram", "test_result", "deploy_config"]),
    name: z.string(),
    content: z.string(),
  })).optional(),
  tokenUsage: z.object({ input: z.number(), output: z.number() }),
})

export type WorkflowNodeData = z.infer<typeof workflowNodeDataSchema>
export type WorkflowNode = z.infer<typeof workflowNodeSchema>
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>
