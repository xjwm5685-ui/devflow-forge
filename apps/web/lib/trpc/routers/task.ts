import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { TRPCError } from "@trpc/server"

export const taskRouter = router({
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.db.task.findMany({
        where: {
          userId: ctx.session.id,
          ...(input?.projectId ? { projectId: input.projectId } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          project: { select: { name: true } },
          workflow: { select: { name: true } },
          _count: { select: { tokenUsage: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 20,
      })

      return tasks.map((t: any) => ({
        ...t,
        tokenUsageTotal: t._count.tokenUsage,
      }))
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findFirst({
        where: { id: input.id, userId: ctx.session.id },
        include: {
          project: true,
          workflow: true,
        },
      })
    }),

  messages: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.agentMessage.findMany({
        where: {
          taskId: input.taskId,
          task: { userId: ctx.session.id },
        },
        orderBy: { createdAt: "asc" },
      })
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.task.updateMany({
        where: { id: input.id, userId: ctx.session.id, status: { in: ["PENDING", "RUNNING"] } },
        data: { status: "CANCELLED", completedAt: new Date() },
      })
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found or cannot be cancelled" })
      }
      return ctx.db.task.findUnique({ where: { id: input.id } })
    }),
})
