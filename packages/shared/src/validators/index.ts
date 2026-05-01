import { z } from "zod"


export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  githubRepo: z.string().optional(),
  githubBranch: z.string().default("main"),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string(),
})

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  projectId: z.string(),
  definition: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
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
  title: z.string().min(1).max(200),
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
