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
      return ctx.db.task.findMany({
        where: {
          userId: ctx.session.id,
          ...(input?.projectId ? { projectId: input.projectId } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          project: { select: { name: true } },
          workflow: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 20,
      })
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
      // Verify task ownership before returning messages
      const task = await ctx.db.task.findFirst({
        where: { id: input.taskId, userId: ctx.session.id },
        select: { id: true },
      })
      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" })
      }

      return ctx.db.agentMessage.findMany({
        where: { taskId: input.taskId },
        orderBy: { createdAt: "asc" },
      })
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.update({
        where: { id: input.id, userId: ctx.session.id },
        data: { status: "CANCELLED", completedAt: new Date() },
      })
    }),
})
