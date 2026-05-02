import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { createWorkflowSchema, workflowNodeSchema, workflowEdgeSchema } from "@devflow/shared"
import { TRPCError } from "@trpc/server"

const workflowDefinitionSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
})

function parseWorkflowDefinition(raw: string | null | undefined) {
  if (!raw) return { nodes: [], edges: [] }
  try {
    const parsed = JSON.parse(raw)
    const result = workflowDefinitionSchema.safeParse(parsed)
    if (result.success) return result.data
    console.warn("[WorkflowRouter] Invalid workflow definition structure:", result.error.flatten())
    return parsed
  } catch (err) {
    console.warn("[WorkflowRouter] Failed to parse workflow definition:", err)
    return { nodes: [], edges: [] }
  }
}

export const workflowRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }).optional())
    .query(async ({ ctx, input }) => {
      const workflows = await ctx.db.workflow.findMany({
        where: {
          ...(input?.projectId ? { projectId: input.projectId } : {}),
          OR: [
            { project: { userId: ctx.session.id } },
            { projectId: null, isTemplate: true },
          ],
        },
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: "desc" },
      })

      return workflows.map((w) => ({
        ...w,
        definition: parseWorkflowDefinition(w.definition),
      }))
    }),

  templates: protectedProcedure.query(async ({ ctx }) => {
    const workflows = await ctx.db.workflow.findMany({
      where: {
        isTemplate: true,
        OR: [
          { templateTag: { in: ["refactor", "deploy", "docs"] } },
          { project: { userId: ctx.session.id } },
        ],
      },
      include: {
        project: { select: { userId: true, name: true } },
      },
      orderBy: { name: "asc" },
    })

    return workflows.map((w) => ({
      ...w,
      definition: parseWorkflowDefinition(w.definition),
    }))
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflow.findFirst({
        where: {
          id: input.id,
          OR: [
            { project: { userId: ctx.session.id } },
            { projectId: null, isTemplate: true },
          ],
        },
        include: { tasks: { orderBy: { createdAt: "desc" }, take: 5 } },
      })
      if (!workflow) return null
      return {
        ...workflow,
        definition: parseWorkflowDefinition(workflow.definition),
      }
    }),

  create: protectedProcedure
    .input(createWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.projectId) {
        const project = await ctx.db.project.findFirst({
          where: { id: input.projectId, userId: ctx.session.id },
          select: { id: true },
        })
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
        }
      }

      return ctx.db.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          projectId: input.projectId ?? null,
          definition: JSON.stringify(input.definition),
          isTemplate: input.isTemplate,
          templateTag: input.templateTag,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().trim().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      definition: workflowDefinitionSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const result = await ctx.db.workflow.updateMany({
        where: { id, project: { userId: ctx.session.id } },
        data: {
          ...data,
          definition: data.definition ? JSON.stringify(data.definition) : undefined,
        },
      })
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" })
      }
      return ctx.db.workflow.findUnique({ where: { id } })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.workflow.deleteMany({
        where: { id: input.id, project: { userId: ctx.session.id } },
      })
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" })
      }
      return { success: true }
    }),

  saveAsTemplate: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
      name: z.string().trim().min(1).max(100),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflow.findFirst({
        where: {
          id: input.workflowId,
          project: { userId: ctx.session.id },
        },
      })

      if (!workflow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" })
      }

      return ctx.db.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          projectId: workflow.projectId,
          definition: workflow.definition,
          isTemplate: true,
          templateTag: "custom",
        },
      })
    }),

  execute: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
      input: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflow.findFirst({
        where: {
          id: input.workflowId,
          project: { userId: ctx.session.id },
        },
        include: { project: true },
      })

      if (!workflow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" })
      }

      if (!workflow.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot execute a workflow without a project" })
      }

      const task = await ctx.db.task.create({
        data: {
          projectId: workflow.projectId,
          workflowId: workflow.id,
          userId: ctx.session.id,
          type: "FULL_PIPELINE",
          status: "PENDING",
          input: JSON.stringify(input.input ?? {}),
        },
      })

      const { processWorkflowTask } = await import("@/lib/queue/workers/agent-worker")
      processWorkflowTask(task.id, workflow).catch(console.error)

      return { taskId: task.id }
    }),
})
