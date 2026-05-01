import { orchestrator } from "@/lib/ai/agents/orchestrator"
import { prisma } from "@/lib/db"

// Mock file tree for demo
const MOCK_FILES = [
  { path: "src/index.ts", content: 'import express from "express";\nconst app = express();\napp.listen(3000);' },
  { path: "src/app.ts", content: 'import express from "express";\nexport const app = express();\napp.use(express.json());' },
  { path: "src/routes/auth.ts", content: 'import { Router } from "express";\nimport jwt from "jsonwebtoken";\nexport const authRouter = Router();\n\nauthRouter.post("/login", (req, res) => {\n  const token = jwt.sign({ id: "user" }, "secret");\n  res.json({ token });\n});' },
  { path: "src/middleware/auth.ts", content: 'export function authMiddleware(req, res, next) {\n  const token = req.headers.authorization;\n  if (!token) return res.status(401).json({ error: "Unauthorized" });\n  next();\n}' },
  { path: "package.json", content: '{\n  "name": "ecommerce-api",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "tsx watch src/index.ts",\n    "build": "tsc",\n    "test": "vitest"\n  }\n}' },
]

interface WorkflowRecord {
  id: string
  name: string
  definition: string
  projectId: string
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

  await orchestrator.executeWorkflow({
    taskId,
    userId: task.userId,
    workflow: workflowDef,
    input: (() => {
      try {
        const parsed = task.input ? JSON.parse(task.input) : null
        return parsed?.prompt ?? task.input ?? "Execute workflow"
      } catch {
        return task.input ?? "Execute workflow"
      }
    })(),
    files: MOCK_FILES,
  })
}
