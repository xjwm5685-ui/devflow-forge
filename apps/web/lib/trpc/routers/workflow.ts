import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { createWorkflowSchema, workflowNodeSchema, workflowEdgeSchema } from "@devflow/shared"
import { TRPCError } from "@trpc/server"

export const workflowRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.workflow.findMany({
        where: {
          ...(input?.projectId ? { projectId: input.projectId } : {}),
          project: { userId: ctx.session.id },
        },
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: "desc" },
      })
    }),

  templates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.workflow.findMany({
      where: { isTemplate: true },
      orderBy: { name: "asc" },
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workflow.findFirst({
        where: {
          id: input.id,
          project: { userId: ctx.session.id },
        },
        include: { tasks: { orderBy: { createdAt: "desc" }, take: 5 } },
      })
    }),

  create: protectedProcedure
    .input(createWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.id },
        select: { id: true },
      })
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      }

      return ctx.db.workflow.create({
        data: {
          ...input,
          definition: JSON.stringify(input.definition),
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      definition: z.object({
        nodes: z.array(workflowNodeSchema),
        edges: z.array(workflowEdgeSchema),
        viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify ownership through project relation
      const workflow = await ctx.db.workflow.findFirst({
        where: { id, project: { userId: ctx.session.id } },
        select: { id: true },
      })
      if (!workflow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" })
      }

      return ctx.db.workflow.update({
        where: { id },
        data: {
          ...data,
          definition: data.definition ? JSON.stringify(data.definition) : undefined,
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through project relation
      const workflow = await ctx.db.workflow.findFirst({
        where: { id: input.id, project: { userId: ctx.session.id } },
        select: { id: true },
      })
      if (!workflow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" })
      }

      return ctx.db.workflow.delete({ where: { id: input.id } })
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
